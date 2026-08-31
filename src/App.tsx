import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  saveAll,
  load,
  login,
  setToken,
  getToken,
  imageUrl,
  deleteBorder,
  deleteRice,
  changePassword,
  DEFAULT_CONFIG
} from './api';
import type { Border, Rice, Slider, Config } from './types';
import {
  Download,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Edit3,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  Coins,
  Wheat,
  Search,
  CheckCircle2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const taka = (n: number) => `৳ ${Number(n || 0).toLocaleString('bn-BD', { maximumFractionDigits: 2 })}`;
const num = (n: number) => Number(n || 0).toLocaleString('bn-BD', { maximumFractionDigits: 2 });
const pot = (n: number) => `${Number(n || 0).toLocaleString('bn-BD', { maximumFractionDigits: 2 })} পট`;

const calc = (meal: number, rate: number, extra: number, misc: number, deposit: number) => {
  const mc = +(meal * rate).toFixed(2);
  const tc = +(mc + extra + misc).toFixed(2);
  return {
    mealCost: mc,
    totalCost: tc,
    managerReceives: tc > deposit ? +(tc - deposit).toFixed(2) : 0,
    borderReceives: deposit >= tc ? +(deposit - tc).toFixed(2) : 0
  };
};

const calcRiceValues = (consumed: number, extra: number, deposit: number) => {
  const tc = +(consumed + extra).toFixed(2);
  return {
    totalCostPot: tc,
    managerReceivesPot: tc > deposit ? +(tc - deposit).toFixed(2) : 0,
    borderReceivesPot: deposit >= tc ? +(deposit - tc).toFixed(2) : 0
  };
};

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="modalHead">
          <b>{title}</b>
          <button onClick={onClose} aria-label="Close modal">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function App() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [borders, setBorders] = useState<Border[]>([]);
  const [rice, setRice] = useState<Rice[]>([]);
  const [slides, setSlides] = useState<Slider[]>([]);
  const [activeTab, setActiveTab] = useState<'money' | 'rice'>('money');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [admin, setAdmin] = useState(!!getToken());
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [edit, setEdit] = useState<Border | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editRice, setEditRice] = useState<Rice | null>(null);
  const [addRiceOpen, setAddRiceOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState('');
  const [riceSearch, setRiceSearch] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);
  const ricePdfRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<any>({
    name: '',
    mealCount: 0,
    mealRate: 0,
    extraCost: 0,
    miscCost: 0,
    totalDeposit: 0
  });

  const [riceForm, setRiceForm] = useState<any>({
    borderName: '',
    consumedPot: 0,
    extraPot: 0,
    depositPot: 0
  });

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 3500);
  };

  const hydrate = async () => {
    try {
      setSyncing(true);
      const r = await load(config);
      setConfig(c => ({
        ...c,
        ...r.data.config,
        appScriptUrl: (r.data.config?.appScriptUrl || c.appScriptUrl || DEFAULT_CONFIG.appScriptUrl).trim()
      }));
      setBorders(r.data.borders);
      setRice(r.data.rice);
      setSlides(r.data.sliderImages);
      notify('Google Sheets থেকে তথ্য সফলভাবে লোড হয়েছে।');
    } catch (e: any) {
      notify(e.message || 'সিঙ্ক ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setSlide(s => (s + 1) % slides.length), 3000);
    return () => clearInterval(t);
  }, [slides.length]);

  const moneySummary = useMemo(() => {
    return borders.reduce(
      (a, b) => {
        a.count += 1;
        a.meals += b.mealCount;
        a.mealCost += b.mealCost;
        a.extra += b.extraCost;
        a.misc += b.miscCost;
        a.cost += b.totalCost;
        a.deposit += b.totalDeposit;
        a.manager += b.managerReceives;
        a.border += b.borderReceives;
        return a;
      },
      { count: 0, meals: 0, mealCost: 0, extra: 0, misc: 0, cost: 0, deposit: 0, manager: 0, border: 0 }
    );
  }, [borders]);

  const riceSummary = useMemo(() => {
    return rice.reduce(
      (a, x) => {
        a.count += 1;
        a.consumed += x.consumedPot;
        a.extra += x.extraPot;
        a.cost += x.totalCostPot;
        a.deposit += x.depositPot;
        a.manager += x.managerReceivesPot;
        a.border += x.borderReceivesPot;
        return a;
      },
      { count: 0, consumed: 0, extra: 0, cost: 0, deposit: 0, manager: 0, border: 0 }
    );
  }, [rice]);

  const filteredBorders = borders.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  const filteredRice = rice.filter(r => r.borderName.toLowerCase().includes(riceSearch.toLowerCase()));

  const persist = async (nb = borders, nr = rice, ns = slides, nc = config) => {
    try {
      setSyncing(true);
      await saveAll(nc, nb, nr, ns);
      notify('Google Sheets-এ তথ্য সফলভাবে সংরক্ষিত হয়েছে।');
    } catch (e: any) {
      notify(e.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setSyncing(false);
    }
  };

  const openAdd = () => {
    setForm({
      name: '',
      mealCount: 0,
      mealRate: config.defaultMealRate || 0,
      extraCost: 0,
      miscCost: 0,
      totalDeposit: 0
    });
    setAddOpen(true);
  };

  const submitAdd = async () => {
    if (!form.name.trim()) return notify('বর্ডারের নাম দিন।');
    const c = calc(+form.mealCount, +form.mealRate, +form.extraCost, +form.miscCost, +form.totalDeposit);
    const b: Border = {
      id: 'border-' + Date.now(),
      name: form.name.trim(),
      mealCount: +form.mealCount,
      mealRate: +form.mealRate,
      ...c,
      extraCost: +form.extraCost,
      miscCost: +form.miscCost,
      totalDeposit: +form.totalDeposit
    };
    const nb = [b, ...borders];
    setBorders(nb);
    setAddOpen(false);
    await persist(nb, rice, slides);
  };

  const submitEdit = async () => {
    if (!edit) return;
    const c = calc(edit.mealCount, edit.mealRate, edit.extraCost, edit.miscCost, edit.totalDeposit);
    const nb = borders.map(b => (b.id === edit.id ? { ...edit, ...c } : b));
    setBorders(nb);
    setEdit(null);
    await persist(nb, rice, slides);
  };

  const removeBorder = async (id: string) => {
    if (!confirm('এই বর্ডারের মিলের সম্পূর্ণ হিসাব মুছে ফেলবেন?')) return;
    const nb = borders.filter(b => b.id !== id);
    setBorders(nb);
    try {
      await deleteBorder(config, id);
      notify('বর্ডারের তথ্য মুছে ফেলা হয়েছে।');
    } catch (e: any) {
      notify(e.message || 'ডিলিট ব্যর্থ');
    }
  };

  const openAddRice = () => {
    setRiceForm({
      borderName: '',
      consumedPot: 0,
      extraPot: 0,
      depositPot: 0
    });
    setAddRiceOpen(true);
  };

  const submitAddRice = async () => {
    if (!riceForm.borderName.trim()) return notify('বর্ডারের নাম দিন।');
    const c = calcRiceValues(+riceForm.consumedPot, +riceForm.extraPot, +riceForm.depositPot);
    const r: Rice = {
      id: 'rice-' + Date.now(),
      borderName: riceForm.borderName.trim(),
      consumedPot: +riceForm.consumedPot,
      extraPot: +riceForm.extraPot,
      depositPot: +riceForm.depositPot,
      ...c
    };
    const nr = [r, ...rice];
    setRice(nr);
    setAddRiceOpen(false);
    await persist(borders, nr, slides);
  };

  const submitEditRice = async () => {
    if (!editRice) return;
    const c = calcRiceValues(editRice.consumedPot, editRice.extraPot, editRice.depositPot);
    const nr = rice.map(r => (r.id === editRice.id ? { ...editRice, ...c } : r));
    setRice(nr);
    setEditRice(null);
    await persist(borders, nr, slides);
  };

  const removeRice = async (id: string) => {
    if (!confirm('এই বর্ডারের চালের সম্পূর্ণ হিসাব মুছে ফেলবেন?')) return;
    const nr = rice.filter(r => r.id !== id);
    setRice(nr);
    try {
      await deleteRice(config, id);
      notify('চালের হিসাব মুছে ফেলা হয়েছে।');
    } catch (e: any) {
      notify(e.message || 'ডিলিট ব্যর্থ');
    }
  };

  const downloadCard = async (b: Border) => {
    const el = document.createElement('div');
    el.className = 'printCard';
    const logo = imageUrl(config.hostelLogoUrl);
    const logoHtml = logo ? `<img class="cardLogo" src="${logo}" alt="${config.hostelName}"/>` : '';
    el.innerHTML = `
      <div class="cardBox">
        <div class="cardHeader">
          ${logoHtml}
          <div class="cardHeaderInfo">
            <h2 class="cardHostelName">${config.hostelName}</h2>
            <p class="cardHostelAddress">${config.hostelAddress || ''}</p>
          </div>
          <div class="cardBadge">মাসিক মিল হিসাব ভাউচার</div>
        </div>

        <div class="cardMemberSection">
          <div class="memberInfo">
            <span class="mLabel">বর্ডারের নাম:</span>
            <span class="mValue">${b.name}</span>
          </div>
          <div class="memberDate">
            <span class="mLabel">তারিখ:</span>
            <span class="mValue">${new Date().toLocaleDateString('bn-BD')}</span>
          </div>
        </div>

        <table class="cardTable">
          <thead>
            <tr>
              <th>বিবরণ</th>
              <th>পরিমাণ / রেট</th>
              <th class="textRight">টাকা</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>মিল খরচ</td>
              <td>${num(b.mealCount)} মিল × ${taka(b.mealRate)}</td>
              <td class="textRight fontBold">${taka(b.mealCost)}</td>
            </tr>
            <tr>
              <td>অতিরিক্ত খরচ</td>
              <td>বিশেষ মিল / বাজার</td>
              <td class="textRight">${taka(b.extraCost)}</td>
            </tr>
            <tr>
              <td>বিবিধ খরচ</td>
              <td>ইউটিলিটি / অন্যান্য</td>
              <td class="textRight">${taka(b.miscCost)}</td>
            </tr>
            <tr class="rowTotalCost">
              <td colspan="2"><b>মোট খরচ (মিল + অতিরিক্ত + বিবিধ)</b></td>
              <td class="textRight fontBold">${taka(b.totalCost)}</td>
            </tr>
            <tr class="rowDeposit">
              <td colspan="2"><b>মোট জমা প্রদান</b></td>
              <td class="textRight fontBold">${taka(b.totalDeposit)}</td>
            </tr>
          </tbody>
        </table>

        <div class="cardBalanceGrid">
          <div class="balanceBox ${b.managerReceives > 0 ? 'highlightDebt' : ''}">
            <span class="bLabel">ম্যানেজার পাবে (বকেয়া)</span>
            <span class="bVal managerColor">${b.managerReceives > 0 ? taka(b.managerReceives) : '৳ ০.০০'}</span>
          </div>
          <div class="balanceBox ${b.borderReceives > 0 ? 'highlightCredit' : ''}">
            <span class="bLabel">বর্ডার ফেরত পাবে (উদ্বৃত্ত)</span>
            <span class="bVal borderColor">${b.borderReceives > 0 ? taka(b.borderReceives) : '৳ ০.০০'}</span>
          </div>
        </div>

        <div class="cardSignatures">
          <div class="signBlock">
            <div class="signLine"></div>
            <span>বর্ডারের স্বাক্ষর</span>
          </div>
          <div class="signBlock">
            <div class="signLine"></div>
            <span>ম্যানেজারের স্বাক্ষর</span>
          </div>
        </div>

        <div class="cardFooter">
          <span>সফটওয়্যার ডেভেলপমেন্ট: <b>${config.developer || 'Ariful Islam'}</b></span>
          <span>•</span>
          <span>আদর্শ আল মাস ছাত্রাবাস অটোমেশন সিস্টেম</span>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    const c = await html2canvas(el, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.download = `${b.name}-মিল-হিসাব-কার্ড.png`;
    a.href = c.toDataURL('image/png');
    a.click();
    el.remove();
  };

  const downloadRiceCard = async (r: Rice) => {
    const el = document.createElement('div');
    el.className = 'printCard';
    const logo = imageUrl(config.hostelLogoUrl);
    const logoHtml = logo ? `<img class="cardLogo" src="${logo}" alt="${config.hostelName}"/>` : '';
    el.innerHTML = `
      <div class="cardBox cardBoxRice">
        <div class="cardHeader">
          ${logoHtml}
          <div class="cardHeaderInfo">
            <h2 class="cardHostelName">${config.hostelName}</h2>
            <p class="cardHostelAddress">${config.hostelAddress || ''}</p>
          </div>
          <div class="cardBadge cardBadgeRice">মাসিক চালের হিসাব ভাউচার</div>
        </div>

        <div class="cardMemberSection">
          <div class="memberInfo">
            <span class="mLabel">বর্ডারের নাম:</span>
            <span class="mValue">${r.borderName}</span>
          </div>
          <div class="memberDate">
            <span class="mLabel">তারিখ:</span>
            <span class="mValue">${new Date().toLocaleDateString('bn-BD')}</span>
          </div>
        </div>

        <table class="cardTable">
          <thead>
            <tr>
              <th>বিবরণ</th>
              <th>হিসাব তথ্য</th>
              <th class="textRight">পরিমাণ (পট)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>মিল বাবদ চাল খরচ</td>
              <td>মিল অনুযায়ী ব্যবহৃত চাল</td>
              <td class="textRight fontBold">${num(r.consumedPot)} পট</td>
            </tr>
            <tr>
              <td>অতিরিক্ত চাল খরচ</td>
              <td>বিশেষ খাবার / অতিথি</td>
              <td class="textRight">${num(r.extraPot)} পট</td>
            </tr>
            <tr class="rowTotalCost">
              <td colspan="2"><b>মোট চাল খরচ (মিল + অতিরিক্ত)</b></td>
              <td class="textRight fontBold">${num(r.totalCostPot)} পট</td>
            </tr>
            <tr class="rowDeposit">
              <td colspan="2"><b>মোট চাল জমা প্রদান</b></td>
              <td class="textRight fontBold">${num(r.depositPot)} পট</td>
            </tr>
          </tbody>
        </table>

        <div class="cardBalanceGrid">
          <div class="balanceBox ${r.managerReceivesPot > 0 ? 'highlightDebt' : ''}">
            <span class="bLabel">ম্যানেজার চাল পাবে (বকেয়া)</span>
            <span class="bVal managerColor">${r.managerReceivesPot > 0 ? num(r.managerReceivesPot) + ' পট' : '০ পট'}</span>
          </div>
          <div class="balanceBox ${r.borderReceivesPot > 0 ? 'highlightCredit' : ''}">
            <span class="bLabel">বর্ডার চাল ফেরত পাবে (উদ্বৃত্ত)</span>
            <span class="bVal borderColor">${r.borderReceivesPot > 0 ? num(r.borderReceivesPot) + ' পট' : '০ পট'}</span>
          </div>
        </div>

        <div class="cardSignatures">
          <div class="signBlock">
            <div class="signLine"></div>
            <span>বর্ডারের স্বাক্ষর</span>
          </div>
          <div class="signBlock">
            <div class="signLine"></div>
            <span>ম্যানেজারের স্বাক্ষর</span>
          </div>
        </div>

        <div class="cardFooter">
          <span>সফটওয়্যার ডেভেলপমেন্ট: <b>${config.developer || 'Ariful Islam'}</b></span>
          <span>•</span>
          <span>আদর্শ আল মাস ছাত্রাবাস অটোমেশন সিস্টেম</span>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    const c = await html2canvas(el, { scale: 2.5, useCORS: true, backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.download = `${r.borderName}-চালের-হিসাব-কার্ড.png`;
    a.href = c.toDataURL('image/png');
    a.click();
    el.remove();
  };

  const downloadPdf = async () => {
    if (!pdfRef.current) return;
    const c = await html2canvas(pdfRef.current, { scale: 1.5, useCORS: true });
    const pdf = new jsPDF('l', 'mm', 'a4');
    const w = 280,
      h = (c.height * w) / c.width;
    pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 5, 5, w, Math.min(h, 190));
    pdf.save('আদর্শ-আল-মাস-মিলের-টাকা-হিসাব.pdf');
  };

  const downloadRicePdf = async () => {
    if (!ricePdfRef.current) return;
    const c = await html2canvas(ricePdfRef.current, { scale: 1.5, useCORS: true });
    const pdf = new jsPDF('l', 'mm', 'a4');
    const w = 280,
      h = (c.height * w) / c.width;
    pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 5, 5, w, Math.min(h, 190));
    pdf.save('আদর্শ-আল-মাস-চালের-হিসাব.pdf');
  };

  if (loading) return <div className="loading">লোড হচ্ছে…</div>;

  return (
    <div className="app">
      <header>
        <div className="brand">
          {imageUrl(config.hostelLogoUrl) ? (
            <img
              src={imageUrl(config.hostelLogoUrl)}
              alt={config.hostelName}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          ) : null}
          <div>
            <h1>{config.hostelName}</h1>
            <p>{config.hostelAddress}</p>
          </div>
        </div>
        <div className="headActions">
          {admin && activeTab === 'money' && (
            <button className="btn" onClick={openAdd}>
              <Plus />
              নতুন মিল সদস্য
            </button>
          )}
          {admin && activeTab === 'rice' && (
            <button className="btn" onClick={openAddRice}>
              <Plus />
              নতুন চালের হিসাব
            </button>
          )}
          <button className="iconBtn" onClick={hydrate} disabled={syncing} title="সিঙ্ক">
            <RefreshCw className={syncing ? 'spin' : ''} />
          </button>
          {admin ? (
            <>
              <button className="iconBtn" onClick={() => setSettingsOpen(true)} title="Admin settings">
                <Settings />
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  setToken('');
                  setAdmin(false);
                  notify('Admin logout হয়েছে');
                }}
              >
                <LogOut />
                Logout
              </button>
            </>
          ) : (
            <button className="btn" onClick={() => setLoginOpen(true)}>
              <LogIn />
              Admin Login
            </button>
          )}
        </div>
      </header>

      <main>
        {/* Hero Slider */}
        <section className="hero">
          <div className="slider">
            {slides.length ? (
              imageUrl(slides[slide]?.url) || imageUrl(config.hostelLogoUrl) ? (
                <>
                  <img
                    src={imageUrl(slides[slide]?.url) || imageUrl(config.hostelLogoUrl)}
                    alt={slides[slide]?.title || config.hostelName}
                    onError={e => (e.currentTarget.style.display = 'none')}
                  />
                  <div className="caption">
                    <b>{slides[slide]?.title || 'আদর্শ আল মাস ছাত্রাবাস'}</b>
                  </div>
                  <button className="prev" onClick={() => setSlide((slide - 1 + slides.length) % slides.length)}>
                    <ChevronLeft />
                  </button>
                  <button className="next" onClick={() => setSlide((slide + 1) % slides.length)}>
                    <ChevronRight />
                  </button>
                  <div className="dots">
                    {slides.map((_, i) => (
                      <i key={`dot-${i}`} className={i === slide ? 'active' : ''} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="emptySlide">
                  <ImageIcon />
                  <span>{slides[slide]?.title || 'কোনো ছবি পাওয়া যায়নি'}</span>
                </div>
              )
            ) : (
              <div className="emptySlide">
                <ImageIcon />
                <span>Google Sheets-এর ওয়েবসাইট confi. শীটে sliderImages যোগ করুন</span>
              </div>
            )}
          </div>
        </section>

        {/* Section Navigation Tabs */}
        <div className="sectionNavContainer">
          <div className="navTabsBox">
            <button
              id="tab-meal-money"
              className={`navTabBtn ${activeTab === 'money' ? 'active' : ''}`}
              onClick={() => setActiveTab('money')}
            >
              <Coins className="tabIcon" />
              <span>মিলের হিসাব (টাকা)</span>
              <span className="tabBadge">{num(borders.length)} জন</span>
            </button>
            <button
              id="tab-rice"
              className={`navTabBtn ${activeTab === 'rice' ? 'active' : ''}`}
              onClick={() => setActiveTab('rice')}
            >
              <Wheat className="tabIcon" />
              <span>চালের হিসাব (পট)</span>
              <span className="tabBadge">{num(rice.length)} জন</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: মিলের হিসাব (টাকা) */}
        {/* ============================================================ */}
        {activeTab === 'money' && (
          <>
            <section className="summaryGrid">
              {[
                ['মোট বর্ডার', num(moneySummary.count) + ' জন'],
                ['মোট মিল', num(moneySummary.meals)],
                ['ম্যানেজার এর মোট জমা (আয়)', taka(moneySummary.deposit)],
                ['মোট মিলের খরচ', taka(moneySummary.cost)],
                ['ম্যানেজার পাবে (বকেয়া)', taka(moneySummary.manager)],
                ['বর্ডার ফেরত পাবে', taka(moneySummary.border)],
                ['শুধু মিল খরচ', taka(moneySummary.mealCost)],
                ['অতিরিক্ত ও বিবিধ', taka(moneySummary.extra + moneySummary.misc)]
              ].map(x => (
                <div className="card" key={x[0]}>
                  <span>{x[0]}</span>
                  <strong>{x[1]}</strong>
                </div>
              ))}
            </section>

            <section className="section" id="money">
              <div className="sectionHead">
                <div>
                  <h2>মিলের টাকার হিসাব</h2>
                  <p>মিল খরচ = মিল সংখ্যা × মিল রেট; মোট খরচ = মিল খরচ + অতিরিক্ত + বিবিধ</p>
                </div>
                <div className="searchBox">
                  <Search className="searchIcon" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="বর্ডারের নাম খুঁজুন…"
                  />
                </div>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        'ক্রো. নং',
                        'বর্ডারের নাম',
                        'মিল সংখ্যা',
                        'মিল রেট',
                        'মিল খরচ',
                        'অতিরিক্ত',
                        'বিবিধ',
                        'মোট খরচ',
                        'মোট জমা',
                        'ম্যানেজার পাবে',
                        'বর্ডার পাবে',
                        'কার্ড',
                        ...(admin ? ['অ্যাকশন'] : [])
                      ].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBorders.length === 0 ? (
                      <tr>
                        <td colSpan={admin ? 13 : 12} className="emptyRow">
                          কোনো বর্ডারের মিল হিসাব পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredBorders.map((b, i) => (
                        <tr key={b.id}>
                          <td>{num(i + 1)}</td>
                          <td className="name">{b.name}</td>
                          <td>{num(b.mealCount)}</td>
                          <td>{taka(b.mealRate)}</td>
                          <td>{taka(b.mealCost)}</td>
                          <td>{taka(b.extraCost)}</td>
                          <td>{taka(b.miscCost)}</td>
                          <td>
                            <b>{taka(b.totalCost)}</b>
                          </td>
                          <td>{taka(b.totalDeposit)}</td>
                          <td className="manager">{b.managerReceives ? taka(b.managerReceives) : '—'}</td>
                          <td className="border">{b.borderReceives ? taka(b.borderReceives) : '—'}</td>
                          <td>
                            <button
                              className="mini cardBtn"
                              onClick={() => downloadCard(b)}
                              title={`${b.name} এর মিল কার্ড ডাউনলোড করুন`}
                            >
                              <Download />
                              কার্ড
                            </button>
                          </td>
                          {admin && (
                            <td>
                              <button className="mini" onClick={() => setEdit({ ...b })} title="সম্পাদনা">
                                <Edit3 />
                              </button>
                              <button className="mini red" onClick={() => removeBorder(b.id)} title="মুছুন">
                                <Trash2 />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="downloads">
              <button className="btn" onClick={downloadPdf}>
                <FileText />
                সম্পূর্ণ মিলের হিসাব PDF
              </button>
              <div className="cardDownloadTitle">বর্ডার অনুযায়ী মিল কার্ড ডাউনলোড:</div>
              <div className="cardBtnGrid">
                {borders.map(b => (
                  <button key={`money-card-${b.id}`} className="btn light" onClick={() => downloadCard(b)}>
                    <Download />
                    {b.name} (মিল কার্ড)
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 2: চালের হিসাব (পট) */}
        {/* ============================================================ */}
        {activeTab === 'rice' && (
          <>
            <section className="summaryGrid">
              {[
                ['মোট সদস্য', num(riceSummary.count) + ' জন'],
                ['মিল বাবদ চাল খরচ', pot(riceSummary.consumed)],
                ['অতিরিক্ত চাল খরচ', pot(riceSummary.extra)],
                ['চালের মোট খরচ', pot(riceSummary.cost)],
                ['মোট চাল জমা', pot(riceSummary.deposit)],
                ['ম্যানেজার চাল পাবে (বকেয়া)', pot(riceSummary.manager)],
                ['বর্ডার চাল ফেরত পাবে (উদ্বৃত্ত)', pot(riceSummary.border)]
              ].map(x => (
                <div className="card" key={x[0]}>
                  <span>{x[0]}</span>
                  <strong>{x[1]}</strong>
                </div>
              ))}
            </section>

            <section className="section" id="rice">
              <div className="sectionHead">
                <div>
                  <h2>
                    মিলের চালের হিসাব <small className="unitBadge">(একক: পট)</small>
                  </h2>
                  <p>মোট চাল খরচ = মিলের ব্যবহৃত চাল + অতিরিক্ত চাল</p>
                </div>
                <div className="searchBox">
                  <Search className="searchIcon" />
                  <input
                    value={riceSearch}
                    onChange={e => setRiceSearch(e.target.value)}
                    placeholder="বর্ডারের নাম খুঁজুন…"
                  />
                </div>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        'ক্রো. নং',
                        'বর্ডারের নাম',
                        'মিল খরচ',
                        'অতিরিক্ত',
                        'মোট খরচ',
                        'মোট জমা',
                        'ম্যানেজার পাবে',
                        'বর্ডার পাবে',
                        'কার্ড',
                        ...(admin ? ['অ্যাকশন'] : [])
                      ].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRice.length === 0 ? (
                      <tr>
                        <td colSpan={admin ? 10 : 9} className="emptyRow">
                          কোনো চালের হিসাব পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredRice.map((r, i) => (
                        <tr key={r.id}>
                          <td>{num(i + 1)}</td>
                          <td className="name">{r.borderName}</td>
                          <td>{pot(r.consumedPot)}</td>
                          <td>{pot(r.extraPot)}</td>
                          <td>
                            <b>{pot(r.totalCostPot)}</b>
                          </td>
                          <td>{pot(r.depositPot)}</td>
                          <td className="manager">{r.managerReceivesPot ? pot(r.managerReceivesPot) : '—'}</td>
                          <td className="border">{r.borderReceivesPot ? pot(r.borderReceivesPot) : '—'}</td>
                          <td>
                            <button
                              className="mini cardBtn"
                              onClick={() => downloadRiceCard(r)}
                              title={`${r.borderName} এর চালের কার্ড ডাউনলোড করুন`}
                            >
                              <Download />
                              কার্ড
                            </button>
                          </td>
                          {admin && (
                            <td>
                              <button className="mini" onClick={() => setEditRice({ ...r })} title="সম্পাদনা">
                                <Edit3 />
                              </button>
                              <button className="mini red" onClick={() => removeRice(r.id)} title="মুছুন">
                                <Trash2 />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="downloads">
              <button className="btn" onClick={downloadRicePdf}>
                <FileText />
                সম্পূর্ণ চালের হিসাব PDF
              </button>
              <div className="cardDownloadTitle">বর্ডার অনুযায়ী চালের কার্ড ডাউনলোড:</div>
              <div className="cardBtnGrid">
                {rice.map(r => (
                  <button key={`rice-card-${r.id}`} className="btn light" onClick={() => downloadRiceCard(r)}>
                    <Download />
                    {r.borderName} (চালের কার্ড)
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        <footer>
          Developed by{' '}
          <a href={config.developerFbUrl || 'https://www.facebook.com/mdarifulislam15'} target="_blank" rel="noreferrer">
            {config.developer}
          </a>
        </footer>
      </main>

      {/* Hidden PDF Printable Structure for Money */}
      <div ref={pdfRef} className="pdfSource">
        {imageUrl(config.hostelLogoUrl) ? <img src={imageUrl(config.hostelLogoUrl)} alt={config.hostelName} /> : null}
        <h2>{config.hostelName}</h2>
        <p>{config.hostelAddress}</p>
        <h3>মাসের সম্পূর্ণ মিলের টাকার হিসাব</h3>
        <table>
          <thead>
            <tr>
              {['বর্ডার', 'মিল', 'রেট', 'মিল খরচ', 'অতিরিক্ত', 'বিবিধ', 'মোট খরচ', 'জমা', 'ম্যানেজার পাবে', 'বর্ডার পাবে'].map(
                (x, idx) => (
                  <th key={`pdf-th-${idx}`}>{x}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {borders.map(b => (
              <tr key={`pdf-tr-${b.id}`}>
                <td>{b.name}</td>
                <td>{b.mealCount}</td>
                <td>{b.mealRate}</td>
                <td>{b.mealCost}</td>
                <td>{b.extraCost}</td>
                <td>{b.miscCost}</td>
                <td>{b.totalCost}</td>
                <td>{b.totalDeposit}</td>
                <td>{b.managerReceives}</td>
                <td>{b.borderReceives}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hidden PDF Printable Structure for Rice */}
      <div ref={ricePdfRef} className="pdfSource">
        {imageUrl(config.hostelLogoUrl) ? <img src={imageUrl(config.hostelLogoUrl)} alt={config.hostelName} /> : null}
        <h2>{config.hostelName}</h2>
        <p>{config.hostelAddress}</p>
        <h3>মাসের সম্পূর্ণ চালের হিসাব (একক: পট)</h3>
        <table>
          <thead>
            <tr>
              {['বর্ডারের নাম', 'মিল খরচ (পট)', 'অতিরিক্ত (পট)', 'মোট খরচ (পট)', 'মোট জমা (পট)', 'ম্যানেজার পাবে (পট)', 'বর্ডার পাবে (পট)'].map(
                (x, idx) => (
                  <th key={`rice-pdf-th-${idx}`}>{x}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {rice.map(r => (
              <tr key={`rice-pdf-tr-${r.id}`}>
                <td>{r.borderName}</td>
                <td>{r.consumedPot}</td>
                <td>{r.extraPot}</td>
                <td>{r.totalCostPot}</td>
                <td>{r.depositPot}</td>
                <td>{r.managerReceivesPot}</td>
                <td>{r.borderReceivesPot}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <div className="toast">{toast}</div>}

      {loginOpen && (
        <Login
          config={config}
          onClose={() => setLoginOpen(false)}
          onSuccess={() => {
            setAdmin(true);
            setLoginOpen(false);
            notify('Admin login সফল হয়েছে');
          }}
        />
      )}

      {addOpen && (
        <BorderForm
          title="নতুন মিল সদস্য যুক্ত করুন"
          form={form}
          setForm={setForm}
          onClose={() => setAddOpen(false)}
          onSave={submitAdd}
        />
      )}

      {edit && (
        <BorderForm
          title="বর্ডারের মিল তথ্য সম্পাদনা"
          form={edit}
          setForm={setEdit}
          onClose={() => setEdit(null)}
          onSave={submitEdit}
        />
      )}

      {addRiceOpen && (
        <RiceForm
          title="নতুন চালের হিসাব যুক্ত করুন"
          form={riceForm}
          setForm={setRiceForm}
          onClose={() => setAddRiceOpen(false)}
          onSave={submitAddRice}
        />
      )}

      {editRice && (
        <RiceForm
          title="চালের হিসাব সম্পাদনা"
          form={editRice}
          setForm={setEditRice}
          onClose={() => setEditRice(null)}
          onSave={submitEditRice}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          config={config}
          setConfig={setConfig}
          slides={slides}
          setSlides={setSlides}
          onClose={() => setSettingsOpen(false)}
          onSave={async () => {
            await persist(borders, rice, slides, config);
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Login({ config, onClose, onSuccess }: { config: Config; onClose: () => void; onSuccess: () => void }) {
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!p.trim()) {
      setErr('পাসওয়ার্ড লিখুন');
      return;
    }
    try {
      const r = await login(config, p);
      setToken(r.token);
      onSuccess();
    } catch (e: any) {
      setErr(e.message || 'ভুল পাসওয়ার্ড');
    }
  };
  return (
    <Modal title="Admin Login" onClose={onClose}>
      <form className="form" onSubmit={handleLogin}>
        <label>
          পাসওয়ার্ড
          <input
            type="password"
            value={p}
            onChange={e => {
              setP(e.target.value);
              setErr('');
            }}
            placeholder="পাসওয়ার্ড লিখুন (যেমন: 180665)"
            autoFocus
          />
        </label>
        {err && <div className="error">{err}</div>}
        <button type="submit" className="btn full">
          <ShieldCheck />
          Login
        </button>
      </form>
    </Modal>
  );
}

function BorderForm({
  title,
  form,
  setForm,
  onClose,
  onSave
}: {
  title: string;
  form: any;
  setForm: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const c = calc(+form.mealCount, +form.mealRate, +form.extraCost, +form.miscCost, +form.totalDeposit);
  return (
    <Modal title={title} onClose={onClose}>
      <div className="form grid2">
        {[
          ['name', 'বর্ডারের নাম', 'text'],
          ['mealCount', 'মিল সংখ্যা', 'number'],
          ['mealRate', 'মিল রেট', 'number'],
          ['extraCost', 'অতিরিক্ত', 'number'],
          ['miscCost', 'বিবিধ', 'number'],
          ['totalDeposit', 'মোট জমা', 'number']
        ].map(([k, l, t]) => (
          <label key={k}>
            {l}
            <input
              type={t}
              value={form[k] ?? ''}
              onChange={e => setForm({ ...form, [k]: t === 'number' ? Number(e.target.value) : e.target.value })}
            />
          </label>
        ))}
        <div className="previewCalc">
          <b>মিল খরচ:</b> {taka(c.mealCost)}
          <br />
          <b>মোট খরচ:</b> {taka(c.totalCost)}
          <br />
          <b>ম্যানেজার পাবে:</b> {taka(c.managerReceives)} &nbsp;|&nbsp; <b>বর্ডার পাবে:</b> {taka(c.borderReceives)}
        </div>
        <button className="btn full" onClick={onSave}>
          <CheckCircle2 />
          সংরক্ষণ করুন
        </button>
      </div>
    </Modal>
  );
}

function RiceForm({
  title,
  form,
  setForm,
  onClose,
  onSave
}: {
  title: string;
  form: any;
  setForm: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const c = calcRiceValues(+form.consumedPot, +form.extraPot, +form.depositPot);
  return (
    <Modal title={title} onClose={onClose}>
      <div className="form grid2">
        <label className="colSpan2">
          বর্ডারের নাম
          <input
            type="text"
            value={form.borderName ?? ''}
            onChange={e => setForm({ ...form, borderName: e.target.value })}
            placeholder="বর্ডারের নাম লিখুন"
          />
        </label>
        <label>
          মিল বাবদ চাল খরচ (পট)
          <input
            type="number"
            value={form.consumedPot ?? ''}
            onChange={e => setForm({ ...form, consumedPot: Number(e.target.value) })}
          />
        </label>
        <label>
          অতিরিক্ত চাল খরচ (পট)
          <input
            type="number"
            value={form.extraPot ?? ''}
            onChange={e => setForm({ ...form, extraPot: Number(e.target.value) })}
          />
        </label>
        <label className="colSpan2">
          মোট চাল জমা প্রদান (পট)
          <input
            type="number"
            value={form.depositPot ?? ''}
            onChange={e => setForm({ ...form, depositPot: Number(e.target.value) })}
          />
        </label>
        <div className="previewCalc colSpan2">
          <b>মোট চাল খরচ:</b> {pot(c.totalCostPot)}
          <br />
          <b>ম্যানেজার চাল পাবে:</b> {pot(c.managerReceivesPot)} &nbsp;|&nbsp; <b>বর্ডার চাল ফেরত পাবে:</b> {pot(c.borderReceivesPot)}
        </div>
        <button className="btn full colSpan2" onClick={onSave}>
          <CheckCircle2 />
          চালের হিসাব সংরক্ষণ করুন
        </button>
      </div>
    </Modal>
  );
}

function SettingsModal({
  config,
  setConfig,
  slides,
  setSlides,
  onClose,
  onSave
}: {
  config: Config;
  setConfig: any;
  slides: Slider[];
  setSlides: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const [newPass, setNewPass] = useState('');
  return (
    <Modal title="Admin Dashboard — Settings & Configuration" onClose={onClose}>
      <div className="form">
        <label>
          মেসের নাম
          <input value={config.hostelName} onChange={e => setConfig({ ...config, hostelName: e.target.value })} />
        </label>
        <label>
          ঠিকানা
          <input value={config.hostelAddress} onChange={e => setConfig({ ...config, hostelAddress: e.target.value })} />
        </label>
        <label>
          Apps Script URL
          <input value={config.appScriptUrl} onChange={e => setConfig({ ...config, appScriptUrl: e.target.value })} />
        </label>
        <label>
          ডিফল্ট মিল রেট
          <input
            type="number"
            value={config.defaultMealRate}
            onChange={e => setConfig({ ...config, defaultMealRate: Number(e.target.value) })}
          />
        </label>
        <label>
          লোগো URL
          <input
            value={config.hostelLogoUrl}
            onChange={e => setConfig({ ...config, hostelLogoUrl: imageUrl(e.target.value) })}
          />
        </label>
        <hr />
        <b>Slider Images — প্রতি ৩ সেকেন্ডে পরিবর্তন</b>
        {slides.map((s, i) => (
          <div className="slideRow" key={s.id}>
            <input
              value={s.title}
              onChange={e => setSlides(slides.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
            />
            <input
              value={s.url}
              onChange={e => setSlides(slides.map((x, j) => (j === i ? { ...x, url: imageUrl(e.target.value) } : x)))}
            />
            <button className="mini red" onClick={() => setSlides(slides.filter(x => x.id !== s.id))}>
              <Trash2 />
            </button>
          </div>
        ))}
        <button
          className="btn light"
          onClick={() => setSlides([...slides, { id: 'slide-' + Date.now(), title: 'নতুন ছবি', url: '' }])}
        >
          <Plus />
          ছবি যুক্ত করুন
        </button>
        <hr />
        <b>Admin Password পরিবর্তন</b>
        <input
          type="password"
          value={newPass}
          onChange={e => setNewPass(e.target.value)}
          placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)"
        />
        <button
          className="btn"
          onClick={async () => {
            if (newPass.length < 8) return alert('কমপক্ষে ৮ অক্ষর দিন');
            try {
              await changePassword(config, newPass);
              setNewPass('');
              alert('পাসওয়ার্ড পরিবর্তন হয়েছে');
            } catch (e: any) {
              alert(e.message);
            }
          }}
        >
          পাসওয়ার্ড পরিবর্তন
        </button>
        <button className="btn full" onClick={onSave}>
          সব কনফিগারেশন সংরক্ষণ
        </button>
      </div>
    </Modal>
  );
}
