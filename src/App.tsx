/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  HandCoins, 
  PiggyBank, 
  CalendarClock, 
  Plus, 
  Search, 
  Menu, 
  X,
  MapPin,
  Phone,
  Info,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc, 
  setDoc, 
  getDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

// --- Types ---

interface Loan {
  id: string;
  customer_name: string;
  account_no: string;
  mobile_no: string;
  guarantor_name: string;
  guarantor_mobile_no: string;
  amount: number;
  total_with_profit: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: any;
}

interface Saving {
  id: string;
  type: 'general' | 'monthly';
  date: string;
  customer_name: string;
  account_no: string;
  amount: number;
  profit: number;
  description: string;
  created_at: any;
}

interface Setting {
  admin_password?: string;
  logo_url?: string;
}

type View = 'home' | 'loans' | 'general_savings' | 'monthly_savings' | 'admin' | 'login';

// --- Components ---

const NavItem = ({ active, icon: Icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
        : 'text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
    }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'text-gray-400 group-hover:text-emerald-500'} />
    <span className="font-medium text-sm">{label}</span>
    {active && <ChevronRight size={16} className="ml-auto" />}
  </button>
);

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) => (
  <div className={`bg-white p-6 rounded-3xl shadow-sm border-l-4 ${color} flex items-center gap-4`}>
    <div className={`p-3 rounded-2xl ${color.replace('border-', 'bg-').replace('-600', '-50')} ${color.replace('border-', 'text-')}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

  const Header = ({ societyInfo, logoUrl }: { societyInfo: any, logoUrl?: string }) => (
    <div className="mb-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
      <div className={`${logoUrl ? '' : 'bg-emerald-600 p-2 shadow-lg'} rounded-3xl text-white overflow-hidden w-24 h-24 flex items-center justify-center`}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        ) : (
          <LayoutDashboard size={48} />
        )}
      </div>
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-gray-900">{societyInfo.name}</h1>
        <p className="text-gray-500 flex items-center justify-center md:justify-start gap-2 mt-1">
          <MapPin size={16} className="text-emerald-600" /> {societyInfo.address}
        </p>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3">
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
            স্থাপিত: {societyInfo.established}
          </span>
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
            {societyInfo.shariah}
          </span>
        </div>
      </div>
    </div>
  );

const ExcelHeader = ({ title, societyInfo, subtitle }: { title: string, societyInfo: any, subtitle?: string }) => (
  <div className="text-center mb-6 border-b-2 border-emerald-800 pb-4">
    <h1 className="text-blue-700 text-xl font-bold">{societyInfo.name}</h1>
    <p className="text-gray-800 text-sm">{societyInfo.address}</p>
    <p className="text-gray-800 text-sm">স্থাপিত: {societyInfo.established}</p>
    <p className="text-emerald-700 text-sm font-bold">({societyInfo.shariah})</p>
    <p className="text-gray-800 text-sm font-bold mt-1">{subtitle || societyInfo.updateDate}</p>
    <h2 className="text-emerald-800 text-lg font-bold mt-2 underline decoration-emerald-800 underline-offset-4">{title}</h2>
  </div>
);

const FilterBar = ({ 
  onFiltersChange, 
  filters 
}: { 
  onFiltersChange: (updates: Partial<{ year: string, month: string, account_no: string, filterType: string }>) => void,
  filters: { year: string, month: string, account_no: string, filterType: string }
}) => {
  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { label: 'সব মাস', value: '' },
    { label: 'জানুয়ারি', value: '01' },
    { label: 'ফেব্রুয়ারি', value: '02' },
    { label: 'মার্চ', value: '03' },
    { label: 'এপ্রিল', value: '04' },
    { label: 'মে', value: '05' },
    { label: 'জুন', value: '06' },
    { label: 'জুলাই', value: '07' },
    { label: 'আগস্ট', value: '08' },
    { label: 'সেপ্টেম্বর', value: '09' },
    { label: 'অক্টোবর', value: '10' },
    { label: 'নভেম্বর', value: '11' },
    { label: 'ডিসেম্বর', value: '12' },
  ];

  return (
    <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs font-semibold text-gray-500 mb-1">খুঁজুন</label>
        <select 
          value={filters.filterType}
          onChange={(e) => {
            onFiltersChange({
              filterType: e.target.value,
              year: '',
              month: '',
              account_no: ''
            });
          }}
          className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">সিলেক্ট করুন</option>
          <option value="all">সব হিসাব দেখুন</option>
          <option value="year">বছর অনুযায়ী প্রদান</option>
          <option value="month">মাস অনুযায়ী প্রদান</option>
          <option value="account">একাউন্ট দিয়ে প্রদান</option>
        </select>
      </div>

      {(filters.filterType === 'year' || filters.filterType === 'month') && (
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">বছর</label>
          <select 
            value={filters.year}
            onChange={(e) => onFiltersChange({ year: e.target.value })}
            className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">সব বছর</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      {filters.filterType === 'month' && (
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">মাস</label>
          <select 
            value={filters.month}
            onChange={(e) => onFiltersChange({ month: e.target.value })}
            className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      )}

      {filters.filterType === 'account' && (
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">একাউন্ট নং</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="একাউন্ট নং..."
              value={filters.account_no}
              onChange={(e) => onFiltersChange({ account_no: e.target.value })}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const formatDate = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('-')) return dateStr || '----------';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
};

// --- Main App Component ---

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [settings, setSettings] = useState<Setting>({});
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [filters, setFilters] = useState({ year: '', month: '', account_no: '', filterType: '' });

  const societyInfo = {
    name: "ইনসাফ সঞ্চয়-ঋণদান সমবায় সমিতি লিমিটেড",
    address: "ডাকঘরঃ কয়ারিয়া, উপজেলাঃ কালকিনি, জেলাঃ মাদারীপুর।",
    established: "২০২১ ইং",
    shariah: "ইসলামী শরীয়াহ মোতাবেক পরিচালিত",
    updateDate: "০১/১২/২০২৩ থেকে প্রদানকৃত"
  };

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'app_settings');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as Setting);
      } else {
        const defaultSettings = { admin_password: 'As@02920', logo_url: '' };
        setDoc(settingsRef, defaultSettings).catch(err => {
          console.error("Error initializing default settings:", err);
        });
        setSettings(defaultSettings);
      }
    }, (error) => {
      console.error("Error fetching settings:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dataViews: View[] = ['home', 'loans', 'general_savings', 'monthly_savings', 'admin'];
    if (dataViews.includes(currentView)) {
      if (currentView === 'admin' && !isLoggedIn) {
        setIsLoading(false);
        return;
      }
      fetchData();
    } else {
      setLoans([]);
      setSavings([]);
      setIsLoading(false);
    }
  }, [filters, currentView, isLoggedIn]);


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings && adminPassword === settings.admin_password) {
      setIsLoggedIn(true);
      setCurrentView('admin');
    } else {
      alert('ভুল পাসওয়ার্ড');
    }
  };

  const handlePasswordChange = async (newPassword: string) => {
    if (!newPassword) return;
    try {
      await updateDoc(doc(db, 'settings', 'app_settings'), {
        admin_password: newPassword
      });
      alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে');
    } catch (error) {
      console.error("Error changing password:", error);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, 'settings', 'app_settings'), {
          logo_url: base64String
        });
        alert('লোগো সফলভাবে আপলোড করা হয়েছে');
      } catch (error) {
        console.error("Error uploading logo:", error);
        alert('লোগো আপলোড করতে সমস্যা হয়েছে। সম্ভবত ফাইলের সাইজ অনেক বড়।');
      }
    };
    reader.readAsDataURL(file);
  };

  const fetchData = async () => {
    const isHome = currentView === 'home';
    const isAdmin = currentView === 'admin';
    const isLoans = currentView === 'loans';
    const isGeneral = currentView === 'general_savings';
    const isMonthly = currentView === 'monthly_savings';

    setIsLoading(true);
    setFetchError(null);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("সার্ভার থেকে তথ্য পেতে অনেক সময় লাগছে। দয়া করে আবার চেষ্টা করুন।")), 15000)
    );

    try {
      const fetchAllData = async () => {
        // --- Fetch Loans ---
        let loansQuery = query(collection(db, 'loans'));
        
        if (filters.filterType === 'account' && filters.account_no) {
          loansQuery = query(collection(db, 'loans'), where('account_no', '==', filters.account_no.trim()));
        } else if (filters.filterType === 'year' && filters.year) {
          loansQuery = query(
            collection(db, 'loans'), 
            where('start_date', '>=', `${filters.year}-01-01`),
            where('start_date', '<=', `${filters.year}-12-31`)
          );
        } else if (filters.filterType === 'month' && filters.year && filters.month) {
          loansQuery = query(
            collection(db, 'loans'), 
            where('start_date', '>=', `${filters.year}-${filters.month}-01`),
            where('start_date', '<=', `${filters.year}-${filters.month}-31`)
          );
        }

        const loansSnapshot = await getDocs(loansQuery);
        let loansData = loansSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Loan));
        loansData.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
        setLoans(loansData);

        // --- Fetch Savings ---
        let savingsQuery = query(collection(db, 'savings'));
        
        if (isGeneral) {
          savingsQuery = query(collection(db, 'savings'), where('type', '==', 'general'));
        } else if (isMonthly) {
          savingsQuery = query(collection(db, 'savings'), where('type', '==', 'monthly'));
        }

        const savingsSnapshot = await getDocs(savingsQuery);
        let savingsData = savingsSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Saving));
        
        if (filters.filterType === 'year' && filters.year) {
          savingsData = savingsData.filter(s => s.date >= `${filters.year}-01-01` && s.date <= `${filters.year}-12-31`);
        } else if (filters.filterType === 'month' && filters.year && filters.month) {
          savingsData = savingsData.filter(s => s.date >= `${filters.year}-${filters.month}-01` && s.date <= `${filters.year}-${filters.month}-31`);
        } else if (filters.filterType === 'account' && filters.account_no) {
          savingsData = savingsData.filter(s => s.account_no === filters.account_no.trim());
        }

        savingsData.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setSavings(savingsData);
      };

      // Race between fetch and timeout
      await Promise.race([fetchAllData(), timeoutPromise]);
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setFetchError(error.message || "তথ্য লোড করতে সমস্যা হয়েছে। দয়া করে ইন্টারনেট কানেকশন চেক করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!id) {
      alert('ভুল আইডি');
      return;
    }
    try {
      await updateDoc(doc(db, 'loans', id), {
        status: newStatus
      });
      alert('স্টাটাস সফলভাবে পরিবর্তন করা হয়েছে');
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      alert('সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না');
    }
  };

  const handleAddLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const loanData = {
      ...data,
      amount: parseFloat(data.amount as string),
      total_with_profit: parseFloat(data.total_with_profit as string),
      status: editingLoan ? editingLoan.status : 'চলমান',
      created_at: editingLoan ? editingLoan.created_at : Timestamp.now()
    };
    
    try {
      if (editingLoan) {
        await updateDoc(doc(db, 'loans', editingLoan.id), loanData);
      } else {
        await addDoc(collection(db, 'loans'), loanData);
      }
      setShowForm(false);
      setEditingLoan(null);
      fetchData();
    } catch (error) {
      console.error("Error saving loan:", error);
    }
  };

  const handleAddSaving = async (e: React.FormEvent<HTMLFormElement>, type: 'general' | 'monthly') => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const savingData = {
      ...data,
      type,
      amount: parseFloat(data.amount as string),
      profit: parseFloat(data.profit as string || '0'),
      description: type === 'general' ? 'সাধারণ সঞ্চয়' : 'ডিপিএস',
      created_at: editingSaving ? editingSaving.created_at : Timestamp.now()
    };
    
    try {
      if (editingSaving) {
        await updateDoc(doc(db, 'savings', editingSaving.id), savingData);
      } else {
        await addDoc(collection(db, 'savings'), savingData);
      }
      setShowForm(false);
      setEditingSaving(null);
      fetchData();
    } catch (error) {
      console.error("Error saving saving:", error);
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!id) {
      alert('ভুল আইডি');
      return;
    }
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'loans', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting loan:", error);
      alert('সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSaving = async (id: string) => {
    if (!id) {
      alert('ভুল আইডি');
      return;
    }
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'savings', id));
      fetchData();
    } catch (error) {
      console.error("Error deleting saving:", error);
      alert('সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkImport = async () => {
    const rawData = `মোঃ হেমায়েত বেপারী	122	----------	আতিকুর রহমান	----------	10000	11000	16-12-23	31-10-24
মোঃ রিয়াজ হোসেন	219	০১৭৭৬৭৯০২৮	মোঃ জলিল বাগ	০১৭৬৫৬৩৩১০৩	35000	38500	08-01-24	24-11-24
মোসাঃ মালা বেগম	209	০১৩০০৭৬৩০১১	মোঃ বেল্লাল হোসেন	০১৩০০৭৬৩০১১	10000	11220	05-01-24	16-11-24
শুভ জন্দ্র	134	০১৭১৫১৯৮৯২৬	বিপুল চন্দ্র শিল	০১৭১৫১৯৮৯২৬	50000	56100	04-02-24	24-12-24
রেবেকা আফরোজ	159	০১৭৬৬৪৩৩৯১২	মোঃ অহিদুজ্জামান	০১৭৬৬৪৩৩৯১২	50000	56100	24-02-24	11-01-25
সেকেন্দার আলী সরদার	210	----------	মোঃ ফয়সাল সরদার	----------	10000	11220	24-02-24	11-01-25
মোঃ রাব্বি	217				35000	38500		
মোঃ ফজলুর রহমান	190	০১৭৯৫৬৯৩৫২২	-------	---	100000	110000	30-03-24	04-01-25
অহিদুল ইসলাম	220	০১৩০২৮৯২৪৯৬	নেয়ামাতু্ল্ল	০১৭৬৮১৭৩৬৯৪	20000	22440	31-03-24	04-02-25
মোঃ মাইনুল ইসলাম	200	০১৭১২২৫১১৮২	শামিম হোসাইন	০১৭১৫২১৮২৫২	50000	56100	05-04-24	08-02-25
মোৎ সাকিব হোবাইন	54	০১৭২৯৭৭০০৯৬	এচাহাক ঘরামী	০১৬২৪৪৪৯৮৫১	15000	16830	15-04-24	11-03-25
ইজাজুল করিম লিয়ন	221	০১৮৩৫৯৮৯৭৫৫	মোঃ রাব্বি	০১৩০০৫৯৪৫২২	30000	33660	27-04-24	23-03-25
মোঃ সেলিম সিকদার	183	০১৩২৫-৪৫০৫৩৭	মোঃ হারুন সিকদার	০১৭১৮-৭৬৯৯৭৬	25000	28050	20-05-24	19-04-25
মনির	222	০১৭৭২৪৮৩৬৯৩	শাওন ঘরামী	০১৩০১৫১৭৩৮৬	30000	33825	29-05-24	23-04-25
বেলাল হোসেন	223	০১৭৬৮৭১৯৩৪১	মোঃ মাইনুদ্দিন ফকির	০১৯১১৪৭৭৬২৬	30000	33825	29-05-24	23-04-25
বেল্লাল হোসেন	208	০১৭১৭২৬৮৩৯৬	মোঃ আলাউদ্দিন সিকদার	০১৭১৮৫১৩১৭১	50000	56100	06-06-24	24-05-25
অহিদুল ইসলাম	220	০১৩০২৮৯২৪৯৬	নেয়ামাতু্ল্ল	০১৭৬৮১৭৩৬৯৪	30000	33660	15-06-24	15-05-25
কাজী হাসিব	224	০১৭১০৬৭৫২৪১	কাজী খলিদ সাইফুল্লাহ	০১৭১২৭৪৯৫১৬	25000	28875	07-07-24	12-06-25
মোঃ জুয়েল	225	০১৭৯০৩০১৭৩৮	মোসাঃ নাজমা বেগম	০১৭১৬২১৭৪২৪	10000	11000	17-07-24	30-12-24
ফরিদ উদ্দিন সংগ্রাম আকন	88	০১৭২৪৫৫৬১৯৩	----------	----------	80000	88000	29-07-24	30-06-25
শুভ জন্দ্র	134	০১৭১৫১৯৮৯২৬	বিপুল চন্দ্র শিল	০১৭১৫১৯৮৯২৬	50000	53000	06-08-24	30-12-24
মোঃ কবির হাওলাদার	226	০১৩১৫৩২৫১০৯	----------	----------	20000	21200	28-08-24	30-12-24
মোঃ ফারুক সরদার	76	০১৭৬৬৮১৮৪৭৬	মোসাঃ সাহিদা বেগম	০১৭৪০১৩৮৪৩০	25000	26496	05-09-24	30-12-24
মোসাঃ মালা বেগম	209	----------	বেলাল হোসেন	----------	15000	15800	05-10-24	30-12-24
মোঃ জুয়েল	225	০১৭৯০৩০১৭৩৮	মোসাঃ নাজমা বেগম	০১৭১৬২১৭৪২৪	20000	22500	06-01-25	25-09-25
মোঃ ফারুক সরদার	76	০১৭৬৬৮১৮৪৭৬	মোসাঃ সাহিদা বেগম	০১৭৪০১৩৮৪৩০	50000	56980	06-01-25	10-11-25
মোঃ নাজমুল হোসেন	193	০১৩১৭৭৫০৫৭৬	মোঃ ফজলুর রহমান	০১৭৭২১১০৫৮৪	30000	34100	13-01-25	09-12-25
হাচানাত ফকির	9	০১৭০৬৬১৪১৫০	মোঃ ফজলুর রহমান	০১৭৭২১১০৫৮৪	50000	56760	15-01-25	29-11-25
শুভ জন্দ্র	134	০১৭১৫১৯৮৯২৬	বিপুল চন্দ্র শিল	০১৭১৫১৯৮৯২৬	100000	112500	18-01-25	25-11-25
মোঃ জাহিদ হোসাইন	227	০১৭৪১১০৬৪৫৬	মোঃ জাকির হোসেন	০১৭৫৬৩১৫১৩৬	30000	33900	26-02-25	26-01-26
মোঃ হেমায়েত বেপারী	228	০১৭৩২৭৭৪১০৫	রিফাত বেপারী	০১৮৬৭০০৮৮৮৪	50000	56925	26-02-25	26-01-26
মোঃ রবিউল ইসলাম	229	০১৮৬১০৮৯৮৮৫			50000	56925	02-03-25	17-01-26
মোঃ ছানাউল হাওলাদার	230	০১৭৮১৫০০৬৯৯	নাজমা আক্তার	০১৭৫৩৪৪৪৩৭৭	20000	22600	18-03-25	17-03-25
মোঃ শওকত হোসেন	79	০১৭৫৬৩১৫১৯৮	মোছাঃ হাওয়ারোন	০১৭৫৬৩১৫১৭৫	30000	33875	23-03-25	20-02-26
মোঃ সেলিম সিকদার	183	০১৩২৫-৪৫০৫৩৭	মোঃ হারুন সিকদার	০১৭১৮-৭৬৯৯৭৬	25000	28320	10-05-25	10-04-26
মোঃ জালাল সরদার	231	০১৭৬০-২২০৯২৪	মোঃ আলাউদ্দিন চোকদার		25000	28380	22-05-25	22-04-26
মোঃ আলী সিকদার	58	০১৭৪৪-৮৯৩৩১৮			30000	33770	01-06-25	01-05-26
সেকেন্দার আলী সরদার	210	----------	মোঃ ফয়সাল সরদার	----------	20000	22880	04-06-25	04-05-26
মোঃ জুয়েল	225	০১৭৯০৩০১৭৩৮	মোসাঃ নাজমা বেগম	০১৭১৬২১৭৪২৪	30000	33900	26-06-25	25-05-26
মোঃ ইকবাল হাসান	232	০১৭৭৬৬৪৪৮২৮	----------	----------	50000	56705	26-06-25	25-05-26
মোঃ নিরব	233	০১৩০৭৫১৪২০২	মোঃ জুয়েল	০১৭১৬২১৭৪২৪	50000	56760	20-07-25	26-06-26
মোঃ সাইফুল ইসলাম	90	০১৭৮৫৩৩৫০৭৯	মোঃ আলমগীর হোসেন বেপারী	০১৭৩২১২৬৫০৪	50000	57200	10-07-25	10-06-26
মোঃ আবদুছ ছালাম	218	০১৭১৬৭৭২৬৭৭	মোসাঃ বিলকিছ বেগম	০০০০০০০০	15000	17160	10-07-25	10-06-26
রিপন সরদার	234	০১৭১৯৩৫৯৫২২		০০০০০০০	50000	57200	07-09-25	07-08-26
মোঃ আলী সিকদার	58	০১৭৪৪-৮৯৩৩১৮	----------	----------	50000	56000	15-09-25	13-01-26
ফরিদ উদ্দিন সংগ্রাম আকন	88	০১৭২৪৫৫৬১৯৩	----------	----------	100000	113000	16-10-25	15-09-26
মোঃ ফজলুর রহমান	190	০১৭৯৫৬৯৩৫২২	-------	---	100000	113000	18-11-25	17-10-26
শুভ জন্দ্র	134	০১৭১৫১৯৮৯২৬	বিপুল চন্দ্র শিল	০১৭১৫১৯৮৯২৬	100000	112750	20-12-25	19-11-26
মোঃ জাহিদ হোসাইন	227	০১৭৪১১০৬৪৫৬	মোঃ জাকির হোসেন	০১৭৫৬৩১৫১৩৬	50000	57000	27-12-25	26-11-26
মোঃ ছানাউল হাওলাদার	230	০১৭৮১৫০০৬৯৯	নাজমা আক্তার	০১৭৫৩৪৪৪৩৭৭	50000	57000	11-01-26	11-01-27
মোঃ ফারুক সরদার	76	০১৭৬৬৮১৮৪৭৬	মোসাঃ সাহিদা বেগম	০১৭৪০১৩৮৪৩০	50000	57200	09-02-26	09-01-27
মোঃ হেমায়েত বেপারী	228	০১৭৩২৭৭৪১০৫	রিফাত বেপারী	০১৮৬৭০০৮৮৮৪	50000	57200	25-02-26	25-01-26`;

    const lines = rawData.split('\n');
    setIsImporting(true);
    setImportProgress(0);
    let count = 0;

    const convertDate = (d: string) => {
      if (!d || d.trim() === '' || d.includes('---')) return '';
      const p = d.trim().split('-');
      if (p.length !== 3) return d;
      let [day, month, year] = p;
      if (year.length === 2) year = '20' + year;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split('\t');
      if (parts.length < 2) continue;

      const [pName, pAcc, pMobile, pGName, pGMobile, pAmount, pTotal, pSDate, pEDate] = parts;

      const loanData = {
        customer_name: (pName || '').trim(),
        account_no: (pAcc || '').trim(),
        mobile_no: (pMobile || '').trim() === '----------' ? '' : (pMobile || '').trim(),
        guarantor_name: (pGName || '').trim() === '----------' || (pGName || '').trim() === '-------' ? '' : (pGName || '').trim(),
        guarantor_mobile_no: (pGMobile || '').trim() === '----------' || (pGMobile || '').trim() === '---' ? '' : (pGMobile || '').trim(),
        amount: parseFloat(pAmount || '0') || 0,
        total_with_profit: parseFloat(pTotal || '0') || 0,
        start_date: convertDate(pSDate || ''),
        end_date: convertDate(pEDate || ''),
        status: 'চলমান',
        created_at: Timestamp.now()
      };

      try {
        await addDoc(collection(db, 'loans'), loanData);
        count++;
        setImportProgress(Math.round(((i + 1) / lines.length) * 100));
      } catch (e) {
        console.error("Error importing line:", line, e);
      }
    }

    alert(`${count} টি ডাটা সফলভাবে ইমপোর্ট করা হয়েছে। পেজটি এখন রিফ্রেশ হবে।`);
    setIsImporting(false);
    window.location.reload();
  };

  const renderHome = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="মোট বিনিয়োগ প্রদান (চলমান)" 
          value={`${loans.filter(l => (l.status || 'চলমান') === 'চলমান').reduce((acc, l) => acc + (Number(l.total_with_profit) || 0), 0).toLocaleString()} ৳`} 
          icon={HandCoins} 
          color="border-emerald-600" 
        />
        <StatCard 
          label="মোট সাধারণ সঞ্চয় প্রদান" 
          value={`${savings.filter(s => s.type === 'general').reduce((acc, s) => acc + (Number(s.amount) || 0), 0).toLocaleString()} ৳`} 
          icon={PiggyBank} 
          color="border-blue-600" 
        />
        <StatCard 
          label="মোট মাসিক সঞ্চয় (ডিপিএস) প্রদান" 
          value={`${savings.filter(s => s.type === 'monthly').reduce((acc, s) => acc + (Number(s.amount) || 0), 0).toLocaleString()} ৳`} 
          icon={CalendarClock} 
          color="border-purple-600" 
        />
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
            <Info size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-800">প্রতিষ্ঠানের তথ্য</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">প্রতিষ্ঠানের নাম</p>
              <p className="text-lg text-gray-700 font-medium">{societyInfo.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">ঠিকানা</p>
              <p className="text-lg text-gray-700 font-medium">{societyInfo.address}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">স্থাপিত</p>
              <p className="text-lg text-gray-700 font-medium">{societyInfo.established}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">নীতিমালা</p>
              <p className="text-lg text-emerald-700 font-bold">{societyInfo.shariah}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoans = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <HandCoins className="text-emerald-600" /> বিনিয়োগ হিসাব
        </h2>
      </div>

      <FilterBar 
        filters={filters} 
        onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))} 
      />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ExcelHeader title="বিনিয়োগ তালিকা" societyInfo={societyInfo} />
        
        <div className="grid grid-cols-3 gap-4 mb-6 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <div className="text-center">
            <p className="text-xs text-emerald-600 font-bold uppercase">মোট বিনিয়োগ সংখ্যা</p>
            <p className="text-xl font-bold text-emerald-800">{loans.length}</p>
          </div>
          <div className="text-center border-x border-emerald-200">
            <p className="text-xs text-emerald-600 font-bold uppercase">মোট বিনিয়োগ পরিমাণ</p>
            <p className="text-xl font-bold text-emerald-800">{loans.reduce((acc, l) => acc + l.amount, 0).toLocaleString()} ৳</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-emerald-600 font-bold uppercase">মুনাফাসহ মোট</p>
            <p className="text-xl font-bold text-emerald-800">{loans.reduce((acc, l) => acc + l.total_with_profit, 0).toLocaleString()} ৳</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-[#FCE4D6]">
                <th className="border border-gray-400 p-2">ক্রমিক নং</th>
                <th className="border border-gray-400 p-2">গ্রাহকের নাম</th>
                <th className="border border-gray-400 p-2">একাউন্ট নং</th>
                <th className="border border-gray-400 p-2">গ্রাহকের মোবাইল নং</th>
                <th className="border border-gray-400 p-2">জামিনদারের নাম</th>
                <th className="border border-gray-400 p-2">জামিনদারের মোবাইল নং</th>
                <th className="border border-gray-400 p-2">বিনিয়োগের পরিমান</th>
                <th className="border border-gray-400 p-2">মুনাফাসহ মোট</th>
                <th className="border border-gray-400 p-2">বিনিয়োগ প্রদানের তারিখ</th>
                <th className="border border-gray-400 p-2">মেয়াদ শেষ হবার তারিখ</th>
                <th className="border border-gray-400 p-2">স্টাটাস</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, idx) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 p-2 font-bold">{loan.customer_name}</td>
                  <td className="border border-gray-300 p-2 text-center">{loan.account_no}</td>
                  <td className="border border-gray-300 p-2 text-center">{loan.mobile_no || '----------'}</td>
                  <td className="border border-gray-300 p-2">{loan.guarantor_name || '----------'}</td>
                  <td className="border border-gray-300 p-2 text-center">{loan.guarantor_mobile_no || '----------'}</td>
                  <td className="border border-gray-300 p-2 text-right font-bold">{loan.amount.toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-right font-bold">{loan.total_with_profit.toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-center">{formatDate(loan.start_date)}</td>
                  <td className="border border-gray-300 p-2 text-center">{formatDate(loan.end_date)}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                      (loan.status || 'চলমান') === 'চলমান' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {loan.status || 'চলমান'}
                    </span>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={11} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন তথ্য পাওয়া যায়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSavings = (type: 'general' | 'monthly') => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          {type === 'general' ? <PiggyBank className="text-blue-600" /> : <CalendarClock className="text-purple-600" />}
          {type === 'general' ? 'সাধারণ সঞ্চয় হিসাব' : 'মাসিক সঞ্চয় (ডিপিএস) হিসাব'}
        </h2>
      </div>

      <FilterBar 
        filters={filters} 
        onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))} 
      />

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ExcelHeader 
          title={type === 'general' ? 'সাধারণ সঞ্চয় তালিকা' : 'মাসিক সঞ্চয় (ডিপিএস) তালিকা'} 
          societyInfo={societyInfo} 
        />

        <div className={`grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl border ${type === 'general' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'}`}>
          <div className="text-center">
            <p className={`text-xs font-bold uppercase ${type === 'general' ? 'text-blue-600' : 'text-purple-600'}`}>মোট জমাকৃত টাকার পরিমাণ</p>
            <p className={`text-xl font-bold ${type === 'general' ? 'text-blue-800' : 'text-purple-800'}`}>{savings.reduce((acc, s) => acc + s.amount, 0).toLocaleString()} ৳</p>
          </div>
          <div className="text-center border-l border-gray-200">
            <p className={`text-xs font-bold uppercase ${type === 'general' ? 'text-blue-600' : 'text-purple-600'}`}>মোট মুনাফা</p>
            <p className={`text-xl font-bold ${type === 'general' ? 'text-blue-800' : 'text-purple-800'}`}>{savings.reduce((acc, s) => acc + s.profit, 0).toLocaleString()} ৳</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-[#E2EFDA]">
                <th className="border border-gray-400 p-2">ক্রমিক নং</th>
                <th className="border border-gray-400 p-2">তারিখ</th>
                <th className="border border-gray-400 p-2">গ্রাহকের নাম</th>
                <th className="border border-gray-400 p-2">একাউন্ট নং</th>
                <th className="border border-gray-400 p-2">জমাকৃত টাকার পরিমাণ</th>
                <th className="border border-gray-400 p-2">মুনাফা</th>
                <th className="border border-gray-400 p-2">বিবরণ</th>
              </tr>
            </thead>
            <tbody>
              {savings.map((saving, idx) => (
                <tr key={saving.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 p-2 text-center">{formatDate(saving.date)}</td>
                  <td className="border border-gray-300 p-2 font-bold">{saving.customer_name}</td>
                  <td className="border border-gray-300 p-2 text-center">{saving.account_no}</td>
                  <td className="border border-gray-300 p-2 text-right font-bold">{saving.amount.toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-right text-emerald-600 font-bold">{saving.profit.toLocaleString()}</td>
                  <td className="border border-gray-300 p-2 text-center">{saving.description}</td>
                </tr>
              ))}
              {savings.length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন তথ্য পাওয়া যায়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const [activeAdminTab, setActiveAdminTab] = useState<'loans' | 'general_savings' | 'monthly_savings' | 'settings'>('loans');
  const [adminFormType, setAdminFormType] = useState<'loan' | 'general_saving' | 'monthly_saving' | null>(null);

  const renderAdmin = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <LayoutDashboard className="text-emerald-600" /> এডমিন প্যানেল
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setAdminFormType('loan'); setShowForm(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> বিনিয়োগ
          </button>
          <button 
            onClick={() => { setAdminFormType('general_saving'); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> সাধারণ সঞ্চয়
          </button>
          <button 
            onClick={() => { setAdminFormType('monthly_saving'); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> ডিপিএস
          </button>
        </div>
      </div>

      <FilterBar 
        filters={filters} 
        onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))} 
      />

      <div className="flex flex-wrap border-b border-gray-200">
        <button 
          onClick={() => setActiveAdminTab('loans')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'loans' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          বিনিয়োগ ব্যবস্থাপনা
        </button>
        <button 
          onClick={() => setActiveAdminTab('general_savings')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'general_savings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          সাধারণ সঞ্চয় ব্যবস্থাপনা
        </button>
        <button 
          onClick={() => setActiveAdminTab('monthly_savings')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'monthly_savings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          ডিপিএস ব্যবস্থাপনা
        </button>
        <button 
          onClick={() => setActiveAdminTab('settings')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'settings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          সেটিংস
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeAdminTab === 'loans' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">একাউন্ট নং</th>
                  <th className="border border-gray-300 p-2">নাম</th>
                  <th className="border border-gray-300 p-2">পরিমাণ</th>
                  <th className="border border-gray-300 p-2">তারিখ</th>
                  <th className="border border-gray-300 p-2">স্টাটাস</th>
                  <th className="border border-gray-300 p-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => (
                  <tr key={loan.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-center">{loan.account_no}</td>
                    <td className="border border-gray-300 p-2 font-bold">{loan.customer_name}</td>
                    <td className="border border-gray-300 p-2 text-right">{loan.amount.toLocaleString()}</td>
                    <td className="border border-gray-300 p-2 text-center">{formatDate(loan.start_date)}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <select 
                        value={loan.status || 'চলমান'}
                        onChange={(e) => handleUpdateStatus(loan.id, e.target.value)}
                        className={`px-2 py-1 rounded text-[10px] font-bold outline-none cursor-pointer ${
                          (loan.status || 'চলমান') === 'চলমান' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <option value="চলমান">চলমান</option>
                        <option value="পরিশোধিত">পরিশোধিত</option>
                      </select>
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingLoan(loan); setAdminFormType('loan'); setShowForm(true); }}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          এডিট
                        </button>
                        <button 
                          onClick={() => handleDeleteLoan(loan.id)}
                          disabled={deletingId === loan.id}
                          className={`text-red-600 hover:text-red-800 font-bold ${deletingId === loan.id ? 'opacity-50' : ''}`}
                        >
                          {deletingId === loan.id ? 'মুছছে...' : 'মুছুন'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={6} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন তথ্য পাওয়া যায়নি</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {(activeAdminTab === 'general_savings' || activeAdminTab === 'monthly_savings') && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">একাউন্ট নং</th>
                  <th className="border border-gray-300 p-2">নাম</th>
                  <th className="border border-gray-300 p-2">পরিমাণ</th>
                  <th className="border border-gray-300 p-2">তারিখ</th>
                  <th className="border border-gray-300 p-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {savings
                  .filter(s => activeAdminTab === 'general_savings' ? s.type === 'general' : s.type === 'monthly')
                  .map(saving => (
                  <tr key={saving.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-center">{saving.account_no}</td>
                    <td className="border border-gray-300 p-2 font-bold">{saving.customer_name}</td>
                    <td className="border border-gray-300 p-2 text-right">{saving.amount.toLocaleString()}</td>
                    <td className="border border-gray-300 p-2 text-center">{formatDate(saving.date)}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingSaving(saving); setAdminFormType(saving.type === 'general' ? 'general_saving' : 'monthly_saving'); setShowForm(true); }}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          এডিট
                        </button>
                        <button 
                          onClick={() => handleDeleteSaving(saving.id)}
                          disabled={deletingId === saving.id}
                          className={`text-red-600 hover:text-red-800 font-bold ${deletingId === saving.id ? 'opacity-50' : ''}`}
                        >
                          {deletingId === saving.id ? 'মুছছে...' : 'মুছুন'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminTab === 'settings' && (
          <div className="space-y-8 max-w-md">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800">লোগো পরিবর্তন</h3>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <LayoutDashboard className="text-gray-400" size={32} />
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload}
                  className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100">
              <h3 className="font-bold text-gray-800">পাসওয়ার্ড পরিবর্তন</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const newPass = (e.currentTarget.elements.namedItem('new_password') as HTMLInputElement).value;
                handlePasswordChange(newPass);
                e.currentTarget.reset();
              }} className="space-y-3">
                <input 
                  required
                  name="new_password"
                  type="password" 
                  placeholder="নতুন পাসওয়ার্ড লিখুন"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <button 
                  type="submit"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  পাসওয়ার্ড আপডেট করুন
                </button>
              </form>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100">
              <h3 className="font-bold text-red-600">ডাটা ইমপোর্ট (একবার ব্যবহারযোগ্য)</h3>
              <p className="text-xs text-gray-500">আপনার দেওয়া বিনিয়োগের ডাটাগুলো এখানে ক্লিক করে ইমপোর্ট করুন।</p>
              <button 
                onClick={handleBulkImport}
                disabled={isImporting}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isImporting ? `ইমপোর্ট হচ্ছে (${importProgress}%)` : 'বিনিয়োগ ডাটা ইমপোর্ট করুন'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLoanForm = () => (
    <form onSubmit={handleAddLoan} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">গ্রাহকের নাম</label>
          <input required name="customer_name" defaultValue={editingLoan?.customer_name} type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">একাউন্ট নং</label>
          <input required name="account_no" defaultValue={editingLoan?.account_no} type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">গ্রাহকের মোবাইল নং</label>
          <input name="mobile_no" defaultValue={editingLoan?.mobile_no} type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">জামিনদারের নাম</label>
          <input name="guarantor_name" defaultValue={editingLoan?.guarantor_name} type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">জামিনদারের মোবাইল নং</label>
          <input name="guarantor_mobile_no" defaultValue={editingLoan?.guarantor_mobile_no} type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">বিনিয়োগের পরিমান</label>
          <input required name="amount" defaultValue={editingLoan?.amount} type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">মুনাফাসহ মোট</label>
          <input required name="total_with_profit" defaultValue={editingLoan?.total_with_profit} type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">বিনিয়োগ প্রদানের তারিখ</label>
          <input required name="start_date" defaultValue={editingLoan?.start_date} type="date" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">মেয়াদ শেষ হবার তারিখ</label>
          <input required name="end_date" defaultValue={editingLoan?.end_date} type="date" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={() => { setShowForm(false); setEditingLoan(null); }} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
        <button type="submit" className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">{editingLoan ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );

  const renderSavingForm = (type: 'general' | 'monthly') => (
    <form onSubmit={(e) => handleAddSaving(e, type)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">তারিখ</label>
          <input required name="date" defaultValue={editingSaving?.date} type="date" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">গ্রাহকের নাম</label>
          <input required name="customer_name" defaultValue={editingSaving?.customer_name} type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">একাউন্ট নং</label>
          <input required name="account_no" defaultValue={editingSaving?.account_no} type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">জমাকৃত টাকার পরিমাণ</label>
          <input required name="amount" defaultValue={editingSaving?.amount} type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">মুনাফা</label>
          <input name="profit" defaultValue={editingSaving?.profit || 0} type="number" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={() => { setShowForm(false); setEditingSaving(null); }} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
        <button type="submit" className={`px-6 py-2 rounded-lg ${type === 'general' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} text-white transition-colors shadow-sm`}>{editingSaving ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-white border-r border-gray-100 flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className={`${settings.logo_url ? '' : 'bg-emerald-600 p-2 shadow-md'} rounded-xl text-white overflow-hidden w-10 h-10 flex items-center justify-center`}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <LayoutDashboard size={24} />
            )}
          </div>
          <span className="font-bold text-xl text-emerald-800 leading-tight">ইনসাফ সমবায় সমিতি</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <NavItem active={currentView === 'home'} icon={LayoutDashboard} label="হোম পেজ" onClick={() => setCurrentView('home')} />
          <NavItem active={currentView === 'loans'} icon={HandCoins} label="বিনিয়োগ (লোন) প্রদান" onClick={() => setCurrentView('loans')} />
          <NavItem active={currentView === 'general_savings'} icon={PiggyBank} label="সাধারণ সঞ্চয় প্রদান" onClick={() => setCurrentView('general_savings')} />
          <NavItem active={currentView === 'monthly_savings'} icon={CalendarClock} label="মাসিক সঞ্চয় (ডিপিএস) প্রদান" onClick={() => setCurrentView('monthly_savings')} />
          <NavItem active={currentView === 'admin' || currentView === 'login'} icon={Filter} label="এডমিন প্যানেল" onClick={() => {
            if (isLoggedIn) setCurrentView('admin');
            else setCurrentView('login');
          }} />
        </nav>

        <div className="mt-auto bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-2">সহযোগিতার জন্য</p>
          <p className="text-sm font-medium flex items-center gap-2 text-emerald-800">
            <Phone size={14} /> ০১৭০০-০০০০০০
          </p>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className={`${settings.logo_url ? '' : 'bg-emerald-600 p-1.5 shadow-sm'} rounded-lg text-white overflow-hidden w-8 h-8 flex items-center justify-center`}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <LayoutDashboard size={20} />
            )}
          </div>
          <span className="font-bold text-emerald-800">ইনসাফ সমবায় সমিতি</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 top-[65px] bg-white z-40 p-6 flex flex-col gap-4"
          >
            <NavItem active={currentView === 'home'} icon={LayoutDashboard} label="হোম পেজ" onClick={() => { setCurrentView('home'); setIsMobileMenuOpen(false); }} />
            <NavItem active={currentView === 'loans'} icon={HandCoins} label="বিনিয়োগ (লোন) প্রদান" onClick={() => { setCurrentView('loans'); setIsMobileMenuOpen(false); }} />
            <NavItem active={currentView === 'general_savings'} icon={PiggyBank} label="সাধারণ সঞ্চয় প্রদান" onClick={() => { setCurrentView('general_savings'); setIsMobileMenuOpen(false); }} />
            <NavItem active={currentView === 'monthly_savings'} icon={CalendarClock} label="মাসিক সঞ্চয় (ডিপিএস) প্রদান" onClick={() => { setCurrentView('monthly_savings'); setIsMobileMenuOpen(false); }} />
            <NavItem active={currentView === 'admin' || currentView === 'login'} icon={Filter} label="এডমিন প্যানেল" onClick={() => { 
              if (isLoggedIn) setCurrentView('admin');
              else setCurrentView('login');
              setIsMobileMenuOpen(false); 
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {currentView === 'home' && <Header societyInfo={societyInfo} logoUrl={settings.logo_url} />}
        
        {fetchError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold">তথ্য লোড করতে সমস্যা হয়েছে</p>
              <p className="text-sm opacity-80">{fetchError}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => fetchData()}
                className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 whitespace-nowrap"
              >
                আবার চেষ্টা করুন
              </button>
              <button 
                onClick={handleBulkImport}
                disabled={isImporting}
                className="bg-orange-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 whitespace-nowrap disabled:opacity-50"
              >
                {isImporting ? `সেভ হচ্ছে (${importProgress}%)` : 'সরাসরি ডাটা সেভ করুন'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4">
          {isLoading && !fetchError && (
            <div className="flex flex-col items-center justify-center py-12 bg-white/50 rounded-3xl border border-dashed border-emerald-200 mb-8">
              <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-emerald-800 font-bold animate-pulse mb-4">তথ্য লোড হচ্ছে...</p>
              <button 
                onClick={handleBulkImport}
                disabled={isImporting}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-100 disabled:opacity-50"
              >
                {isImporting ? `সেভ হচ্ছে (${importProgress}%)` : 'লোড না হলে এখানে ক্লিক করে ডাটা সেভ করুন'}
              </button>
            </div>
          )}

          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {currentView === 'home' && renderHome()}
            {currentView === 'loans' && renderLoans()}
            {currentView === 'general_savings' && renderSavings('general')}
            {currentView === 'monthly_savings' && renderSavings('monthly')}
            {currentView === 'admin' && isLoggedIn && renderAdmin()}
            {currentView === 'login' && !isLoggedIn && (
              <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                  <div className="bg-emerald-600 w-16 h-16 rounded-2xl text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <LayoutDashboard size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">এডমিন লগইন</h2>
                  <p className="text-gray-500 text-sm">পাসওয়ার্ড দিয়ে প্রবেশ করুন</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">পাসওয়ার্ড</label>
                    <input 
                      required
                      type="password" 
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                  >
                    প্রবেশ করুন
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className={`p-6 flex items-center justify-between text-white ${
                currentView === 'admin' ? (
                  adminFormType === 'loan' ? 'bg-emerald-600' : 
                  adminFormType === 'general_saving' ? 'bg-blue-600' : 'bg-purple-600'
                ) : (
                  currentView === 'loans' ? 'bg-emerald-600' : 
                  currentView === 'general_savings' ? 'bg-blue-600' : 'bg-purple-600'
                )
              }`}>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Plus size={24} /> 
                  {currentView === 'admin' ? (
                    adminFormType === 'loan' ? 'নতুন বিনিয়োগ ফর্ম' : 
                    adminFormType === 'general_saving' ? 'সাধারণ সঞ্চয় ফর্ম' : 'মাসিক সঞ্চয় (ডিপিএস) ফর্ম'
                  ) : (
                    currentView === 'loans' ? 'নতুন বিনিয়োগ ফর্ম' : 
                    currentView === 'general_savings' ? 'সাধারণ সঞ্চয় ফর্ম' : 'মাসিক সঞ্চয় (ডিপিএস) ফর্ম'
                  )}
                </h3>
                <button onClick={() => { setShowForm(false); setEditingLoan(null); setEditingSaving(null); }} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 max-h-[80vh] overflow-y-auto">
                {currentView === 'admin' ? (
                  adminFormType === 'loan' ? renderLoanForm() : 
                  adminFormType === 'general_saving' ? renderSavingForm('general') : renderSavingForm('monthly')
                ) : (
                  currentView === 'loans' ? renderLoanForm() : 
                  currentView === 'general_savings' ? renderSavingForm('general') : renderSavingForm('monthly')
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
