import type{Data,Config,Border,Rice,Slider}from'./types';
export const DEFAULT_CONFIG:Config={hostelName:'আদর্শ আল মাস ছাত্রাবাস',hostelAddress:'',developer:'মোঃ আরিফুল ইসলাম',developerFbUrl:'https://www.facebook.com/mdarifulislam15',hostelLogoUrl:'https://lh3.googleusercontent.com/d/1zO9JQySD2r05aBM7kpI2gVlMGl6zt-QC',currentMonth:'',currentYear:'',defaultMealRate:0,appScriptUrl:'https://script.google.com/macros/s/AKfycbxT9qkN-KjYMzfsSSW7AbWJbyNdgzSgLxVAkgKzRiYtlU2tD9D_NIdyd3UvFi_osQIM/exec'};
const key='almas_admin_token';
export const imageUrl=(u:string)=>{const s=(u||'').trim();if(s.startsWith('https://lh3.googleusercontent.com/d/'))return s;const m=s.match(/\/file\/d\/([\w-]+)/)||s.match(/[?&]id=([\w-]+)/)||s.match(/\/d\/([\w-]+)/);return m?`https://lh3.googleusercontent.com/d/${m[1]}`:s};
const calcBorder=(b:any):Border=>{const meal=Math.max(0,Number(b.mealCount)||0),rate=Math.max(0,Number(b.mealRate)||0),extra=Math.max(0,Number(b.extraCost)||0),misc=Math.max(0,Number(b.miscCost)||0),dep=Math.max(0,Number(b.totalDeposit)||0),mealCost=+(meal*rate).toFixed(2),total=+(mealCost+extra+misc).toFixed(2);return{id:String(b.id),name:String(b.name||''),mealCount:meal,mealRate:rate,mealCost,extraCost:extra,miscCost:misc,totalCost:total,totalDeposit:dep,managerReceives:total>dep?+(total-dep).toFixed(2):0,borderReceives:dep>=total?+(dep-total).toFixed(2):0}};
const calcRice=(r:any):Rice=>{const meal=Math.max(0,Number(r.consumedPot??r.mealCost)||0),extra=Math.max(0,Number(r.extraPot??r.extra)||0),dep=Math.max(0,Number(r.depositPot??r.totalDeposit)||0),total=+(meal+extra).toFixed(2);return{id:String(r.id),borderName:String(r.borderName||r.name||''),consumedPot:meal,extraPot:extra,totalCostPot:total,depositPot:dep,managerReceivesPot:total>dep?+(total-dep).toFixed(2):0,borderReceivesPot:dep>=total?+(dep-total).toFixed(2):0}};
export const FIXED_ADMIN_PASSWORD = '180665';
const LOCAL_STORAGE_KEY = 'almas_hostel_data_cache';

export const getToken = () => sessionStorage.getItem(key) || '';
export const setToken = (t: string) => t ? sessionStorage.setItem(key, t) : sessionStorage.removeItem(key);

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

async function call(config: Config, action: string, payload: any = {}) {
  if (!config.appScriptUrl) throw new Error('Apps Script URL সেট করা হয়নি।');
  try {
    const r = await fetch(config.appScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.error || 'API error');
    return j;
  } catch (err: any) {
    if (err.message && err.message !== 'Failed to fetch') {
      throw err;
    }
    // Return a soft error or rethrow a descriptive message
    throw new Error(err.message === 'Failed to fetch' ? 'সার্ভার সংযোগ সমস্যা। তথ্য লোকালি সংরক্ষিত হয়েছে।' : err.message);
  }
}

export async function load(config: Config): Promise<{ data: Data }> {
  try {
    const r = await fetch(`${config.appScriptUrl}?action=getAllData&t=${Date.now()}`);
    const j = await r.json();
    if (j.success && j.data) {
      const c = { ...DEFAULT_CONFIG, ...j.data.config };
      const parsedData = {
        ...j.data,
        config: c,
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

  // Fallback to cache if available
  const cached = getCachedData();
  if (cached) {
    return {
      data: {
        config: cached.config || DEFAULT_CONFIG,
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
  if (cleanPass === FIXED_ADMIN_PASSWORD) {
    const token = 'admin_token_' + Date.now();
    setToken(token);
    // Optionally ping Google Apps Script in background without blocking
    if (config.appScriptUrl) {
      call(config, 'login', { password: cleanPass }).catch(() => {});
    }
    return { success: true, token };
  }

  // If other password, try remote login with fallback check
  try {
    const res = await call(config, 'login', { password: cleanPass });
    if (res && res.token) {
      setToken(res.token);
      return res;
    }
    throw new Error(res.error || 'ভুল পাসওয়ার্ড।');
  } catch (err: any) {
    if (cleanPass === FIXED_ADMIN_PASSWORD) {
      const token = 'admin_token_' + Date.now();
      setToken(token);
      return { success: true, token };
    }
    throw new Error(err.message === 'Failed to fetch' || err.message?.includes('সার্ভার সংযোগ') ? 'ভুল পাসওয়ার্ড অথবা সার্ভার সংযোগ পাওয়া যায়নি।' : (err.message || 'ভুল পাসওয়ার্ড।'));
  }
};

export const saveAll = async (config: Config, borders: Border[], rice: Rice[], sliderImages: Slider[]) => {
  // Always update local cache immediately for zero data loss
  setCachedData({ config, borders, rice, sliderImages });
  try {
    return await call(config, 'saveAllData', { token: getToken(), payload: { config, borders, rice, sliderImages } });
  } catch (e: any) {
    console.warn('Remote save failed, data kept in local storage', e);
    // don't fail user experience if remote sheet is temporarily unreachable
    return { success: true, localOnly: true };
  }
};

export const deleteBorder = async (config: Config, id: string) => {
  try {
    return await call(config, 'deleteBorder', { token: getToken(), id });
  } catch (e) {
    return { success: true, localOnly: true };
  }
};

export const deleteRice = async (config: Config, id: string) => {
  try {
    return await call(config, 'deleteRice', { token: getToken(), id });
  } catch (e) {
    return { success: true, localOnly: true };
  }
};

export const changePassword = (config: Config, newPassword: string) =>
  call(config, 'changeAdminPassword', { token: getToken(), newPassword });

