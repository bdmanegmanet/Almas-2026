import type { Data, Config, Border, Rice, Slider } from './types';

export const DEFAULT_CONFIG: Config = {
  hostelName: 'আদর্শ আল মাস ছাত্রাবাস',
  hostelAddress: '',
  developer: 'মোঃ আরিফুল ইসলাম',
  developerFbUrl: 'https://www.facebook.com/mdarifulislam15',
  hostelLogoUrl: 'https://lh3.googleusercontent.com/d/1zO9JQySD2r05aBM7kpI2gVlMGl6zt-QC',
  currentMonth: '',
  currentYear: '',
  defaultMealRate: 0,
  appScriptUrl: 'https://script.google.com/macros/s/AKfycbxT9qkN-KjYMzfsSSW7AbWJbyNdgzSgLxVAkgKzRiYtlU2tD9D_NIdyd3UvFi_osQIM/exec'
};

const key = 'almas_admin_token';
export const FIXED_ADMIN_PASSWORD = '180665';
const LOCAL_STORAGE_KEY = 'almas_hostel_data_cache';

export const imageUrl = (u: string) => {
  const s = (u || '').trim();
  if (s.startsWith('https://lh3.googleusercontent.com/d/')) return s;
  const m = s.match(/\/file\/d\/([\w-]+)/) || s.match(/[?&]id=([\w-]+)/) || s.match(/\/d\/([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : s;
};

const calcBorder = (b: any): Border => {
  const meal = Math.max(0, Number(b.mealCount) || 0);
  const rate = Math.max(0, Number(b.mealRate) || 0);
  const extra = Math.max(0, Number(b.extraCost) || 0);
  const misc = Math.max(0, Number(b.miscCost) || 0);
  const dep = Math.max(0, Number(b.totalDeposit) || 0);
  const mealCost = +(meal * rate).toFixed(2);
  const total = +(mealCost + extra + misc).toFixed(2);
  return {
    id: String(b.id || 'border-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    name: String(b.name || ''),
    mealCount: meal,
    mealRate: rate,
    mealCost,
    extraCost: extra,
    miscCost: misc,
    totalCost: total,
    totalDeposit: dep,
    managerReceives: total > dep ? +(total - dep).toFixed(2) : 0,
    borderReceives: dep >= total ? +(dep - total).toFixed(2) : 0
  };
};

const calcRice = (r: any): Rice => {
  const meal = Math.max(0, Number(r.consumedPot ?? r.mealCost) || 0);
  const extra = Math.max(0, Number(r.extraPot ?? r.extra) || 0);
  const dep = Math.max(0, Number(r.depositPot ?? r.totalDeposit) || 0);
  const total = +(meal + extra).toFixed(2);
  return {
    id: String(r.id || 'rice-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
    borderName: String(r.borderName || r.name || ''),
    consumedPot: meal,
    extraPot: extra,
    totalCostPot: total,
    depositPot: dep,
    managerReceivesPot: total > dep ? +(total - dep).toFixed(2) : 0,
    borderReceivesPot: dep >= total ? +(dep - total).toFixed(2) : 0
  };
};

export const getToken = () => sessionStorage.getItem(key) || '';
export const setToken = (t: string) => (t ? sessionStorage.setItem(key, t) : sessionStorage.removeItem(key));

export const getCachedData = (): { config: Config; borders: Border[]; rice: Rice[]; sliderImages: Slider[] } | null => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
};

export const setCachedData = (data: { config: Config; borders: Border[]; rice: Rice[]; sliderImages: Slider[] }) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
};

async function authenticateWithScript(url: string): Promise<string> {
  try {
    const authRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'login', password: FIXED_ADMIN_PASSWORD })
    });
    const authJson = await authRes.json();
    if (authJson.success && authJson.token) {
      setToken(authJson.token);
      return authJson.token;
    }
  } catch (err) {
    console.warn('Auto auth with Apps Script failed:', err);
  }
  return '';
}

async function call(config: Config, action: string, payload: any = {}, retryOnAuth = true): Promise<any> {
  const url = (config.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim();
  if (!url) throw new Error('Apps Script URL সেট করা হয়নি।');

  let token = payload.token || getToken();

  // If this mutating action requires admin and token is missing or local mock token, authenticate first
  const requiresAdmin = ['saveAllData', 'deleteBorder', 'deleteRice', 'setupSheets', 'changeAdminPassword'].includes(action);
  if (requiresAdmin && (!token || token.startsWith('admin_token_'))) {
    const freshToken = await authenticateWithScript(url);
    if (freshToken) {
      token = freshToken;
    }
  }

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload, token })
    });
    const j = await r.json();
    if (!j.success) {
      if (
        retryOnAuth &&
        (j.error?.includes('Admin') || j.error?.includes('expired') || j.error?.includes('invalid') || j.error?.includes('authentication'))
      ) {
        const reToken = await authenticateWithScript(url);
        if (reToken) {
          return await call(config, action, { ...payload, token: reToken }, false);
        }
      }
      throw new Error(j.error || 'Google Sheets API ত্রুটি');
    }
    return j;
  } catch (err: any) {
    if (err.message && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    throw new Error('Google Sheets সার্ভারে সংযোগ করা সম্ভব হয়নি। অনুগ্রহ করে ইন্টারনেট সংযোগ এবং Apps Script URL পরীক্ষা করুন।');
  }
}

export async function load(config: Config): Promise<{ data: Data }> {
  const url = (config.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim();
  if (url) {
    try {
      const r = await fetch(`${url}?action=getAllData&t=${Date.now()}`);
      const j = await r.json();
      if (j.success && j.data) {
        const rawConfig = j.data.config || {};
        const safeConfig: Config = {
          ...DEFAULT_CONFIG,
          ...config,
          ...rawConfig,
          // Preserve valid appScriptUrl
          appScriptUrl: (rawConfig.appScriptUrl || config.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim(),
          defaultMealRate: Number(rawConfig.defaultMealRate ?? config.defaultMealRate ?? DEFAULT_CONFIG.defaultMealRate)
        };
        const parsedData = {
          ...j.data,
          config: safeConfig,
          borders: (j.data.borders || []).map(calcBorder),
          rice: (j.data.rice || []).map(calcRice),
          sliderImages: (j.data.sliderImages || []).map((x: any) => ({ ...x, url: imageUrl(x.url) }))
        };
        setCachedData({
          config: parsedData.config,
          borders: parsedData.borders,
          rice: parsedData.rice,
          sliderImages: parsedData.sliderImages
        });
        return { data: parsedData };
      }
    } catch (e) {
      console.warn('Google Sheets fetch failed, falling back to local cache', e);
    }
  }

  // Fallback to cache if available
  const cached = getCachedData();
  if (cached) {
    return {
      data: {
        config: {
          ...DEFAULT_CONFIG,
          ...cached.config,
          appScriptUrl: (cached.config?.appScriptUrl || config.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim()
        },
        borders: (cached.borders || []).map(calcBorder),
        rice: (cached.rice || []).map(calcRice),
        sliderImages: (cached.sliderImages || []).map((x: any) => ({ ...x, url: imageUrl(x.url) }))
      }
    };
  }

  return {
    data: {
      config: DEFAULT_CONFIG,
      borders: [],
      rice: [],
      sliderImages: []
    }
  };
}

export const login = async (config: Config, password: string): Promise<{ success: boolean; token: string }> => {
  const cleanPass = (password || '').trim();
  const url = (config.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim();

  if (url) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'login', password: cleanPass })
      });
      const j = await r.json();
      if (j.success && j.token) {
        setToken(j.token);
        return j;
      }
      if (cleanPass === FIXED_ADMIN_PASSWORD) {
        const fallbackToken = 'admin_token_' + Date.now();
        setToken(fallbackToken);
        return { success: true, token: fallbackToken };
      }
      throw new Error(j.error || 'ভুল পাসওয়ার্ড।');
    } catch (err: any) {
      if (cleanPass === FIXED_ADMIN_PASSWORD) {
        const fallbackToken = 'admin_token_' + Date.now();
        setToken(fallbackToken);
        return { success: true, token: fallbackToken };
      }
      throw new Error(err.message || 'ভুল পাসওয়ার্ড অথবা সার্ভার সংযোগ পাওয়া যায়নি।');
    }
  }

  if (cleanPass === FIXED_ADMIN_PASSWORD) {
    const fallbackToken = 'admin_token_' + Date.now();
    setToken(fallbackToken);
    return { success: true, token: fallbackToken };
  }
  throw new Error('ভুল পাসওয়ার্ড।');
};

export const saveAll = async (config: Config, borders: Border[], rice: Rice[], sliderImages: Slider[]) => {
  const safeConfig: Config = {
    ...DEFAULT_CONFIG,
    ...config,
    appScriptUrl: (config.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim()
  };
  setCachedData({ config: safeConfig, borders, rice, sliderImages });
  const token = getToken();
  return await call(safeConfig, 'saveAllData', { token, payload: { config: safeConfig, borders, rice, sliderImages } });
};

export const deleteBorder = async (config: Config, id: string) => {
  const safeConfig: Config = {
    ...DEFAULT_CONFIG,
    ...config,
    appScriptUrl: (config.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim()
  };
  return await call(safeConfig, 'deleteBorder', { token: getToken(), id });
};

export const deleteRice = async (config: Config, id: string) => {
  const safeConfig: Config = {
    ...DEFAULT_CONFIG,
    ...config,
    appScriptUrl: (config.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim()
  };
  return await call(safeConfig, 'deleteRice', { token: getToken(), id });
};

export const changePassword = (config: Config, newPassword: string) =>
  call(config, 'changeAdminPassword', { token: getToken(), newPassword });
