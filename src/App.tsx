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
  FileText,
  Menu, 
  X,
  MapPin,
  Phone,
  Info,
  ChevronRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
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
  Timestamp,
  serverTimestamp
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

interface Report {
  id: string;
  month: string;
  year: string;
  prev_month_cash: number;
  prev_month_bank: number;
  total_installment_coll: number;
  total_savings_coll: number;
  service_charge_coll: number;
  new_account_income: number;
  loan_profile_sale: number;
  director_deposit: number;
  office_loan_received: number;
  new_investment_pay: number;
  general_savings_pay: number;
  dps_pay: number;
  general_expense: number;
  director_withdrawal: number;
  office_loan_repayment: number;
  bank_deposit: number;
  bank_withdrawal: number;
  created_at: any;
}

interface OutstandingBalance {
  id: string;
  amount: number;
  date: string;
  created_at: any;
}

interface OutstandingMonthlyReport {
  id: string;
  month: string;
  year: string;
  last_month_outstanding: number;
  current_month_investment: number;
  total_last_plus_investment: number;
  current_month_collection: number;
  should_be_in_field: number;
  actually_in_field: number;
  difference: number;
  created_at: any;
}

interface Setting {
  admin_password?: string;
  logo_url?: string;
}

type View = 'home' | 'loans' | 'general_savings' | 'monthly_savings' | 'reports' | 'outstanding_list' | 'outstanding_monthly_report' | 'admin' | 'login';

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

  const Header = ({ societyInfo, logoUrl, onLogoClick }: { societyInfo: any, logoUrl?: string, onLogoClick: () => void }) => (
    <div className="mb-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6">
      <div 
        onClick={onLogoClick}
        className={`${logoUrl ? '' : 'bg-emerald-600 p-2 shadow-lg'} rounded-3xl text-white overflow-hidden w-24 h-24 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity`}
      >
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
    {subtitle && <p className="text-gray-800 text-sm font-bold mt-1">{subtitle}</p>}
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

const toBengaliNumber = (num: number | string) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => bengaliDigits[parseInt(d)]);
};

const toEnglishNumber = (str: string) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[০-৯]/g, (d) => bengaliDigits.indexOf(d).toString());
};

const formatDate = (dateStr: string) => {
  if (!dateStr || !dateStr.includes('-')) return dateStr || '----------';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return toBengaliNumber(`${day}-${month}-${year}`);
};

const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  if (isNaN(num)) return toBengaliNumber('০');
  const formatted = num.toLocaleString('en-IN');
  return toBengaliNumber(formatted);
};

const CurrencyInput = ({ 
  label, 
  name, 
  defaultValue, 
  value,
  onChange,
  required = false 
}: { 
  label: string, 
  name: string, 
  defaultValue?: number | string, 
  value?: string,
  onChange?: (val: string) => void,
  required?: boolean 
}) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (defaultValue !== undefined) {
      setDisplayValue(formatCurrency(defaultValue));
    }
  }, [defaultValue]);

  useEffect(() => {
    if (value !== undefined) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = toEnglishNumber(e.target.value).replace(/,/g, '');
    if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
      const formatted = rawValue === '' ? '' : formatCurrency(rawValue);
      setDisplayValue(formatted);
      if (onChange) {
        onChange(rawValue);
      }
    }
  };

  const hiddenValue = toEnglishNumber(displayValue).replace(/,/g, '');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input 
        type="text" 
        value={displayValue}
        onChange={handleChange}
        required={required}
        className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <input type="hidden" name={name} value={hiddenValue} />
    </div>
  );
};

const startYear = 2023;
const currentYear = new Date().getFullYear();
const years = Array.from(
  { length: currentYear - startYear + 1 },
  (_, i) => (startYear + i).toString()
);

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

// --- Main App Component ---

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loans, setLoans] = useState<Loan[]>(() => {
    try {
      const cached = localStorage.getItem('cached_loans');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [savings, setSavings] = useState<Saving[]>(() => {
    try {
      const cached = localStorage.getItem('cached_savings');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [outstandingMonthlyReports, setOutstandingMonthlyReports] = useState<OutstandingMonthlyReport[]>([]);
  const [outstandingBalances, setOutstandingBalances] = useState<OutstandingBalance[]>([]);
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cachedSettings = localStorage.getItem('app_settings');
      const cachedLoans = localStorage.getItem('cached_loans');
      return !(cachedSettings || cachedLoans);
    } catch { return true; }
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [settings, setSettings] = useState<Setting>(() => {
    try {
      const cached = localStorage.getItem('app_settings');
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editingOutstandingMonthlyReport, setEditingOutstandingMonthlyReport] = useState<OutstandingMonthlyReport | null>(null);
  const [editingOutstanding, setEditingOutstanding] = useState<OutstandingBalance | null>(null);
  const [filters, setFilters] = useState({ year: '', month: '', account_no: '', filterType: '' });
  const [formKey, setFormKey] = useState(Date.now());
  const [activeAdminTab, setActiveAdminTab] = useState<'loans' | 'general_savings' | 'monthly_savings' | 'reports' | 'outstanding' | 'outstanding_monthly' | 'settings'>('loans');
  const [adminFormType, setAdminFormType] = useState<'loan' | 'general_saving' | 'monthly_saving' | 'report' | 'outstanding' | 'outstanding_monthly' | null>(null);

  const societyInfo = {
    name: "ইনসাফ সঞ্চয়-ঋণদান সমবায় সমিতি লিমিটেড",
    address: "ডাকঘরঃ কয়ারিয়া, উপজেলাঃ কালকিনি, জেলাঃ মাদারীপুর",
    established: "২০২১ ইং",
    shariah: "ইসলামী শরীয়াহ মোতাবেক পরিচালিত"
  };

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'app_settings');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Setting;
        setSettings(data);
        localStorage.setItem('app_settings', JSON.stringify(data));
      } else {
        const defaultSettings = { admin_password: 'As@02920', logo_url: '' };
        setDoc(settingsRef, defaultSettings).catch(err => {
          console.error("Error initializing default settings:", err);
        });
        setSettings(defaultSettings);
        localStorage.setItem('app_settings', JSON.stringify(defaultSettings));
      }
    }, (error) => {
      console.error("Error fetching settings:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dataViews: View[] = ['home', 'loans', 'general_savings', 'monthly_savings', 'reports', 'admin'];
    if (!dataViews.includes(currentView)) {
      setLoans([]);
      setSavings([]);
      setIsLoading(false);
      return;
    }

    if (currentView === 'admin' && !isLoggedIn) {
      setIsLoading(false);
      return;
    }

    // Only set loading to true if we don't have any data yet
    if (loans.length === 0 && savings.length === 0 && reports.length === 0) {
      setIsLoading(true);
    }
    setFetchError(null);

    // --- Filter Logic for Loans ---
    let loansQuery: any = null;
    
    // In admin view, if no filter is selected, show all. In public views, if no filter, show nothing.
    const showAllByDefault = currentView === 'home' || (currentView === 'admin' && !filters.filterType);
    
    if (filters.filterType === 'all' || showAllByDefault) {
      loansQuery = query(collection(db, 'loans'));
    } else if (filters.filterType === 'account' && filters.account_no) {
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

    let unsubscribeLoans = () => {};
    if (loansQuery) {
      unsubscribeLoans = onSnapshot(loansQuery, (snapshot) => {
        const loansData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Loan));
        loansData.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
        setLoans(loansData);
        if (currentView === 'home' || (currentView === 'admin' && !filters.filterType)) {
          localStorage.setItem('cached_loans', JSON.stringify(loansData));
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching loans:", error);
        setFetchError("বিনিয়োগ তথ্য লোড করতে সমস্যা হয়েছে");
        setIsLoading(false);
      });
    } else {
      setLoans([]);
      setIsLoading(false);
    }

    // --- Filter Logic for Savings ---
    const isGeneral = currentView === 'general_savings' || (currentView === 'admin' && activeAdminTab === 'general_savings');
    const isMonthly = currentView === 'monthly_savings' || (currentView === 'admin' && activeAdminTab === 'monthly_savings');
    
    let savingsQuery: any = null;
    if (showAllByDefault || filters.filterType === 'all' || filters.filterType === 'account' || filters.filterType === 'year' || filters.filterType === 'month') {
      savingsQuery = query(collection(db, 'savings'));
    }

    let unsubscribeSavings = () => {};
    if (savingsQuery) {
      unsubscribeSavings = onSnapshot(savingsQuery, (snapshot) => {
        let savingsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Saving));
        
        // Filter by type if applicable
        if (isGeneral) savingsData = savingsData.filter(s => s.type === 'general');
        else if (isMonthly) savingsData = savingsData.filter(s => s.type === 'monthly');

        // Apply filters
        if (filters.filterType === 'year' && filters.year) {
          savingsData = savingsData.filter(s => s.date >= `${filters.year}-01-01` && s.date <= `${filters.year}-12-31`);
        } else if (filters.filterType === 'month' && filters.year && filters.month) {
          savingsData = savingsData.filter(s => s.date >= `${filters.year}-${filters.month}-01` && s.date <= `${filters.year}-${filters.month}-31`);
        } else if (filters.filterType === 'account' && filters.account_no) {
          savingsData = savingsData.filter(s => s.account_no === filters.account_no.trim());
        } else if (filters.filterType === '' && ['loans', 'general_savings', 'monthly_savings'].includes(currentView)) {
          // If "Select" is chosen in public views, show nothing
          savingsData = [];
        }

        savingsData.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setSavings(savingsData);
        if (currentView === 'home' || (currentView === 'admin' && !filters.filterType)) {
          localStorage.setItem('cached_savings', JSON.stringify(savingsData));
        }
      }, (error) => {
        console.error("Error fetching savings:", error);
        setFetchError("সঞ্চয় তথ্য লোড করতে সমস্যা হয়েছে");
      });
    } else {
      setSavings([]);
    }

    // --- Reports and Outstanding Balance ---
    const reportsQuery = query(collection(db, 'reports'));
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Report));
      // Sort client-side to avoid composite index requirement
      reportsData.sort((a, b) => {
        if (b.year !== a.year) return Number(b.year) - Number(a.year);
        return Number(b.month) - Number(a.month);
      });
      setReports(reportsData);
    });

    const outstandingQuery = query(collection(db, 'outstanding_balance'), orderBy('date', 'desc'));
    const unsubscribeOutstanding = onSnapshot(outstandingQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutstandingBalance));
      setOutstandingBalances(data);
    });

    const monthlyReportsQuery = query(collection(db, 'outstanding_monthly_reports'), orderBy('year', 'desc'));
    const unsubscribeMonthlyReports = onSnapshot(monthlyReportsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutstandingMonthlyReport));
      data.sort((a, b) => {
        if (b.year !== a.year) return Number(b.year) - Number(a.year);
        return Number(b.month) - Number(a.month);
      });
      setOutstandingMonthlyReports(data);
    });

    return () => {
      unsubscribeLoans();
      unsubscribeSavings();
      unsubscribeReports();
      unsubscribeOutstanding();
      unsubscribeMonthlyReports();
    };
  }, [filters, currentView, isLoggedIn, activeAdminTab]);

  const fetchData = async () => {
    // fetchData is now handled by onSnapshot, but we keep the function signature 
    // for compatibility with existing calls if any, though they won't do much.
  };

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
        alert('লোগো আপলোড করতে সমস্যা হয়েছে সম্ভবত ফাইলের সাইজ অনেক বড়');
      }
    };
    reader.readAsDataURL(file);
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
    } catch (error: any) {
      console.error("Error updating status:", error);
      alert('স্টাটাস পরিবর্তন করতে সমস্যা হয়েছে: ' + (error.message || 'অজানা সমস্যা'));
    }
  };

  const handleAddLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const amount = parseFloat(data.amount as string);
    const total_with_profit = parseFloat(data.total_with_profit as string);

    if (isNaN(amount) || isNaN(total_with_profit)) {
      alert('দয়া করে সঠিক সংখ্যা লিখুন');
      return;
    }
    
    const loanData = {
      ...data,
      amount,
      total_with_profit,
      status: editingLoan ? editingLoan.status : 'চলমান',
      updated_at: serverTimestamp(),
      created_at: editingLoan ? editingLoan.created_at : serverTimestamp()
    };
    
    try {
      if (editingLoan) {
        await updateDoc(doc(db, 'loans', editingLoan.id), loanData);
        alert('বিনিয়োগ সফলভাবে আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'loans'), loanData);
        alert('বিনিয়োগ সফলভাবে সংরক্ষণ করা হয়েছে');
      }
      setEditingLoan(null);
      setFormKey(Date.now());
    } catch (error: any) {
      console.error("Error saving loan:", error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে: ' + (error.message || 'অজানা সমস্যা'));
    }
  };

  const handleAddSaving = async (e: React.FormEvent<HTMLFormElement>, type: 'general' | 'monthly') => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const amount = parseFloat(data.amount as string);
    const profit = parseFloat(data.profit as string || '0');

    if (isNaN(amount) || isNaN(profit)) {
      alert('দয়া করে সঠিক সংখ্যা লিখুন');
      return;
    }
    
    const savingData = {
      ...data,
      type,
      amount,
      profit,
      description: type === 'general' ? 'সাধারণ সঞ্চয়' : 'ডিপিএস',
      updated_at: serverTimestamp(),
      created_at: editingSaving ? editingSaving.created_at : serverTimestamp()
    };
    
    try {
      if (editingSaving) {
        await updateDoc(doc(db, 'savings', editingSaving.id), savingData);
        alert('সঞ্চয় সফলভাবে আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'savings'), savingData);
        alert('সঞ্চয় সফলভাবে সংরক্ষণ করা হয়েছে');
      }
      setEditingSaving(null);
      setFormKey(Date.now());
    } catch (error: any) {
      console.error("Error saving saving:", error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে: ' + (error.message || 'অজানা সমস্যা'));
    }
  };

  const handleSaveOutstandingMonthlyReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const numericFields = [
      'last_month_outstanding', 'current_month_investment', 'total_last_plus_investment',
      'current_month_collection', 'should_be_in_field', 'actually_in_field', 'difference'
    ];
    
    const reportData: any = {
      month: data.month,
      year: data.year,
      updated_at: serverTimestamp(),
      created_at: editingOutstandingMonthlyReport ? editingOutstandingMonthlyReport.created_at : serverTimestamp()
    };
    
    numericFields.forEach(field => {
      reportData[field] = parseFloat((data[field] as string).replace(/,/g, '')) || 0;
    });
    
    try {
      if (editingOutstandingMonthlyReport) {
        await updateDoc(doc(db, 'outstanding_monthly_reports', editingOutstandingMonthlyReport.id), reportData);
        alert('প্রতিবেদন সফলভাবে আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'outstanding_monthly_reports'), reportData);
        alert('প্রতিবেদন সফলভাবে সংরক্ষণ করা হয়েছে');
      }
      setEditingOutstandingMonthlyReport(null);
      setShowForm(false);
      setFormKey(Date.now());
    } catch (error: any) {
      console.error("Error saving monthly report:", error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteOutstandingMonthlyReport = async (id: string) => {
    if (!id) return;
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই প্রতিবেদনটি মুছে ফেলতে চান?')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'outstanding_monthly_reports', id));
      alert('সফলভাবে মুছে ফেলা হয়েছে');
    } catch (error: any) {
      console.error("Error deleting monthly report:", error);
      alert('মুছে ফেলতে সমস্যা হয়েছে');
    } finally {
      setDeletingId(null);
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
      alert('সফলভাবে মুছে ফেলা হয়েছে');
    } catch (error: any) {
      console.error("Error deleting loan:", error);
      alert('মুছে ফেলতে সমস্যা হয়েছে: ' + (error.message || 'অজানা সমস্যা'));
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
      alert('সফলভাবে মুছে ফেলা হয়েছে');
    } catch (error: any) {
      console.error("Error deleting saving:", error);
      alert('মুছে ফেলতে সমস্যা হয়েছে: ' + (error.message || 'অজানা সমস্যা'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const numericFields = [
      'prev_month_cash', 'prev_month_bank',
      'total_installment_coll', 'total_savings_coll', 'service_charge_coll',
      'new_account_income', 'loan_profile_sale', 'director_deposit', 'office_loan_received',
      'new_investment_pay', 'general_savings_pay', 'dps_pay', 'general_expense',
      'director_withdrawal', 'office_loan_repayment',
      'bank_deposit', 'bank_withdrawal'
    ];
    
    const reportData: any = {
      month: data.month,
      year: data.year,
      updated_at: serverTimestamp(),
      created_at: editingReport ? editingReport.created_at : serverTimestamp()
    };
    
    numericFields.forEach(field => {
      reportData[field] = parseFloat((data[field] as string).replace(/,/g, '')) || 0;
    });
    
    try {
      if (editingReport) {
        await updateDoc(doc(db, 'reports', editingReport.id), reportData);
        alert('রিপোর্ট সফলভাবে আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'reports'), reportData);
        alert('রিপোর্ট সফলভাবে সংরক্ষণ করা হয়েছে');
      }
      setEditingReport(null);
      setShowForm(false);
      setFormKey(Date.now());
    } catch (error: any) {
      console.error("Error saving report:", error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  const handleSaveOutstanding = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat((formData.get('amount') as string).replace(/,/g, '')) || 0;
    const date = formData.get('date') as string;
    
    try {
      if (editingOutstanding) {
        await updateDoc(doc(db, 'outstanding_balance', editingOutstanding.id), { amount, date, updated_at: serverTimestamp() });
        alert('আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'outstanding_balance'), { amount, date, created_at: serverTimestamp() });
        alert('সংরক্ষণ করা হয়েছে');
      }
      setEditingOutstanding(null);
      setShowForm(false);
      setFormKey(Date.now());
    } catch (error) {
      alert('সমস্যা হয়েছে');
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই রিপোর্টটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'reports', id));
      alert('রিপোর্ট মুছে ফেলা হয়েছে');
    } catch (error) {
      alert('মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteOutstanding = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত?')) return;
    try {
      await deleteDoc(doc(db, 'outstanding_balance', id));
      alert('মুছে ফেলা হয়েছে');
    } catch (error) {
      alert('সমস্যা হয়েছে');
    }
  };

  const getPrevMonth = (month: string, year: string) => {
    let m = parseInt(month);
    let y = parseInt(year);
    if (m === 1) {
      m = 12;
      y -= 1;
    } else {
      m -= 1;
    }
    return { month: m.toString().padStart(2, '0'), year: y.toString() };
  };

  const renderHome = () => {
    const latestLoans = [...loans]
      .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
      .slice(-2)
      .reverse();

    const latestOutstanding = outstandingBalances[0];
    const outstandingDate = latestOutstanding?.date ? new Date(latestOutstanding.date) : null;
    const outstandingLabel = outstandingDate 
      ? `মাঠে বকেয়া আছে (${months.find(m => m.value === (outstandingDate.getMonth() + 1).toString().padStart(2, '0'))?.label})`
      : 'মাঠে বকেয়া আছে';

    return (
      <div className="space-y-8">
        {/* Latest Investment Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                <HandCoins size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">সর্বশেষ বিনিয়োগ</h2>
            </div>
            <button 
              onClick={() => setCurrentView('loans')}
              className="text-emerald-600 hover:text-emerald-700 font-bold text-sm flex items-center gap-1 transition-colors"
            >
              সব দেখুন <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {latestLoans.map(loan => (
              <div key={loan.id} className="p-4 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-emerald-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-gray-800">{loan.customer_name}</p>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                    {loan.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">একাউন্ট: {toBengaliNumber(loan.account_no)}</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(loan.amount)}</span>
                </div>
              </div>
            ))}
            {latestLoans.length === 0 && (
              <p className="text-gray-400 italic text-center py-4 col-span-2">কোন বিনিয়োগ তথ্য পাওয়া যায়নি</p>
            )}
          </div>
        </div>

        {/* Outstanding Balance Section */}
        {latestOutstanding && (
          <button 
            onClick={() => setCurrentView('outstanding_list')}
            className="w-full text-left bg-emerald-600 p-8 rounded-3xl shadow-lg text-white relative overflow-hidden transition-transform hover:scale-[1.01] active:scale-[0.99] group"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <HandCoins size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                {outstandingLabel}
                <ChevronRight size={16} />
              </p>
              <h2 className="text-4xl font-black">{formatCurrency(latestOutstanding.amount)}</h2>
            </div>
          </button>
        )}

        {/* Society Info Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
              <Info size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">প্রতিষ্ঠানের তথ্য</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
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
  };

  const OutstandingMonthlyReportView = ({ reports, societyInfo }: { reports: OutstandingMonthlyReport[], societyInfo: any }) => {
    const [filters, setFilters] = useState({ year: '', month: '' });

    useEffect(() => {
      if (reports.length > 0 && !filters.year && !filters.month) {
        const latest = [...reports].sort((a, b) => {
          if (a.year !== b.year) return b.year.localeCompare(a.year);
          return b.month.localeCompare(a.month);
        })[0];
        setFilters({ year: latest.year, month: latest.month });
      }
    }, [reports]);

    const filteredReports = reports.filter(r => 
      (!filters.year || r.year === filters.year) && 
      (!filters.month || r.month === filters.month)
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-emerald-600" />
            বকেয়া মাসিক প্রতিবেদন
          </h2>
        </div>

        <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">বছর</label>
            <select 
              value={filters.year} 
              onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              <option value="">সব বছর</option>
              {years.map(y => <option key={y} value={y}>{toBengaliNumber(y)}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">মাস</label>
            <select 
              value={filters.month} 
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {filteredReports.length > 0 ? (
          filteredReports.map(report => (
            <div key={report.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-none">
              <ExcelHeader 
                title="মাসিক বকেয়া ব্যালেন্স প্রতিবেদন" 
                societyInfo={societyInfo} 
                subtitle={`${months.find(m => m.value === report.month)?.label} - ${toBengaliNumber(report.year)}`}
              />
              
              <div className="mt-8 space-y-4 max-w-2xl mx-auto">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-gray-600">গতমাসে বকেয়া মাঠে ছিলো:</span>
                  <span className="font-bold text-lg">{formatCurrency(report.last_month_outstanding)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-gray-600">চলতি মাসে বিনিয়োগ প্রদান:</span>
                  <span className="font-bold text-lg">{formatCurrency(report.current_month_investment)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-emerald-700 font-bold">গতমাসের বকেয়া + চলতি মাসের বিনিয়োগ:</span>
                  <span className="font-bold text-xl text-emerald-800">{formatCurrency(report.total_last_plus_investment)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-gray-600">চলতি মাসে কিস্তি আদায়:</span>
                  <span className="font-bold text-lg text-red-600">{formatCurrency(report.current_month_collection)}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <span className="text-emerald-700 font-bold">চলতি মাসে মাঠে বকেয়া থাকার কথা:</span>
                  <span className="font-bold text-xl text-emerald-800">{formatCurrency(report.should_be_in_field)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-gray-600">বর্তমানে মাঠে বকেয়া আছে:</span>
                  <span className="font-bold text-lg">{formatCurrency(report.actually_in_field)}</span>
                </div>
                <div className={`flex justify-between items-center p-3 rounded-xl border ${report.difference === 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                  <span className={`${report.difference === 0 ? 'text-blue-700' : 'text-red-700'} font-bold`}>পার্থক্য:</span>
                  <span className={`font-bold text-xl ${report.difference === 0 ? 'text-blue-800' : 'text-red-800'}`}>{formatCurrency(report.difference)}</span>
                </div>
              </div>
              
              <div className="mt-12 flex justify-between px-10 pt-10 border-t border-gray-100">
                <div className="text-center">
                  <div className="w-32 border-t border-gray-400 mb-1 mx-auto"></div>
                  <p className="text-xs font-bold text-gray-500">ক্যাশিয়ার</p>
                </div>
                <div className="text-center">
                  <div className="w-32 border-t border-gray-400 mb-1 mx-auto"></div>
                  <p className="text-xs font-bold text-gray-500">ম্যানেজার</p>
                </div>
                <div className="text-center">
                  <div className="w-32 border-t border-gray-400 mb-1 mx-auto"></div>
                  <p className="text-xs font-bold text-gray-500">সভাপতি</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
            <FileText size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 italic">এই মাসের কোন প্রতিবেদন পাওয়া যায়নি</p>
          </div>
        )}
      </div>
    );
  };

  const OutstandingMonthlyReportForm = ({ 
    editingReport, 
    onSave, 
    onCancel, 
    formKey,
    outstandingBalances,
    loans,
    reports
  }: { 
    editingReport: OutstandingMonthlyReport | null, 
    onSave: (e: React.FormEvent<HTMLFormElement>) => void, 
    onCancel: () => void,
    formKey: number,
    outstandingBalances: OutstandingBalance[],
    loans: Loan[],
    reports: Report[]
  }) => {
    const [month, setMonth] = useState(editingReport?.month || (new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [year, setYear] = useState(editingReport?.year || new Date().getFullYear().toString());
    
    const [lastMonthOutstanding, setLastMonthOutstanding] = useState(editingReport?.last_month_outstanding || 0);
    const [currentMonthInvestment, setCurrentMonthInvestment] = useState(editingReport?.current_month_investment || 0);
    const [currentMonthCollection, setCurrentMonthCollection] = useState(editingReport?.current_month_collection || 0);
    const [actuallyInField, setActuallyInField] = useState(editingReport?.actually_in_field || 0);

    useEffect(() => {
      if (editingReport) return;

      // Auto-fetch values
      const prevMonth = Number(month) === 1 ? 12 : Number(month) - 1;
      const prevYear = Number(month) === 1 ? Number(year) - 1 : Number(year);
      const prevMonthStr = prevMonth.toString().padStart(2, '0');
      
      // Last month outstanding
      const lastMonthData = outstandingBalances.find(ob => {
        const d = new Date(ob.date);
        return (d.getMonth() + 1).toString().padStart(2, '0') === prevMonthStr && d.getFullYear().toString() === prevYear.toString();
      });
      setLastMonthOutstanding(lastMonthData?.amount || 0);

      // Current month investment
      const currentMonthLoans = loans.filter(l => {
        const d = new Date(l.start_date);
        return (d.getMonth() + 1).toString().padStart(2, '0') === month && d.getFullYear().toString() === year;
      });
      setCurrentMonthInvestment(currentMonthLoans.reduce((acc, l) => acc + (l.total_with_profit || l.amount), 0));

      // Current month collection
      const currentMonthReport = reports.find(r => r.month === month && r.year === year);
      setCurrentMonthCollection(currentMonthReport?.total_installment_coll || 0);

      // Actually in field
      const currentMonthOutstanding = outstandingBalances.find(ob => {
        const d = new Date(ob.date);
        return (d.getMonth() + 1).toString().padStart(2, '0') === month && d.getFullYear().toString() === year;
      });
      setActuallyInField(currentMonthOutstanding?.amount || 0);

    }, [month, year, outstandingBalances, loans, reports, editingReport]);

    const totalLastPlusInvestment = lastMonthOutstanding + currentMonthInvestment;
    const shouldBeInField = totalLastPlusInvestment - currentMonthCollection;
    const difference = shouldBeInField - actuallyInField;

    return (
      <form key={formKey} onSubmit={onSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">মাস</label>
            <select 
              name="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {months.filter(m => m.value !== '').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">বছর</label>
            <input 
              type="number" 
              name="year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <CurrencyInput 
            label="গতমাসে বকেয়া মাঠে ছিলো" 
            name="last_month_outstanding" 
            value={lastMonthOutstanding.toString()}
            onChange={(val) => setLastMonthOutstanding(parseFloat(val) || 0)}
          />
          <CurrencyInput 
            label="চলতি মাসে বিনিয়োগ প্রদান" 
            name="current_month_investment" 
            value={currentMonthInvestment.toString()}
            onChange={(val) => setCurrentMonthInvestment(parseFloat(val) || 0)}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">গতমাসের বকেয়া + চলতি মাসের বিনিয়োগ</label>
            <input 
              type="text" 
              readOnly
              value={formatCurrency(totalLastPlusInvestment)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 font-bold"
            />
            <input type="hidden" name="total_last_plus_investment" value={totalLastPlusInvestment} />
          </div>

          <CurrencyInput 
            label="চলতি মাসে কিস্তি আদায়" 
            name="current_month_collection" 
            value={currentMonthCollection.toString()}
            onChange={(val) => setCurrentMonthCollection(parseFloat(val) || 0)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">চলতি মাসে মাঠে বকেয়া থাকার কথা</label>
            <input 
              type="text" 
              readOnly
              value={formatCurrency(shouldBeInField)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 font-bold"
            />
            <input type="hidden" name="should_be_in_field" value={shouldBeInField} />
          </div>

          <CurrencyInput 
            label="বর্তমানে মাঠে বকেয়া আছে" 
            name="actually_in_field" 
            value={actuallyInField.toString()}
            onChange={(val) => setActuallyInField(parseFloat(val) || 0)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">পার্থক্য</label>
            <input 
              type="text" 
              readOnly
              value={formatCurrency(difference)}
              className={`w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 font-bold ${difference !== 0 ? 'text-red-600' : 'text-blue-600'}`}
            />
            <input type="hidden" name="difference" value={difference} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
          <button type="submit" className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">
            {editingReport ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
          </button>
        </div>
      </form>
    );
  };

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
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
          <div className="text-center py-2 border-b sm:border-b-0 sm:border-r border-emerald-200">
            <p className="text-xs text-emerald-600 font-bold uppercase">মোট বিনিয়োগ সংখ্যা</p>
            <p className="text-xl font-bold text-emerald-800">{toBengaliNumber(loans.length)}</p>
          </div>
          <div className="text-center py-2 border-b sm:border-b-0 sm:border-r border-emerald-200">
            <p className="text-xs text-emerald-600 font-bold uppercase">মোট বিনিয়োগ পরিমাণ</p>
            <p className="text-xl font-bold text-emerald-800 break-all px-2">{formatCurrency(loans.reduce((acc, l) => acc + l.amount, 0))}</p>
          </div>
          <div className="text-center py-2">
            <p className="text-xs text-emerald-600 font-bold uppercase">মুনাফাসহ মোট</p>
            <p className="text-xl font-bold text-emerald-800 break-all px-2">{formatCurrency(loans.reduce((acc, l) => acc + l.total_with_profit, 0))}</p>
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
                  <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(idx + 1)}</td>
                  <td className="border border-gray-300 p-2 font-bold">{loan.customer_name}</td>
                  <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(loan.account_no)}</td>
                  <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(loan.mobile_no || '----------')}</td>
                  <td className="border border-gray-300 p-2">{loan.guarantor_name || '----------'}</td>
                  <td className="border border-gray-300 p-2 text-center">{loan.guarantor_mobile_no || '----------'}</td>
                  <td className="border border-gray-300 p-2 text-right font-bold">{formatCurrency(loan.amount)}</td>
                  <td className="border border-gray-300 p-2 text-right font-bold">{formatCurrency(loan.total_with_profit)}</td>
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
                  <td colSpan={11} className="border border-gray-300 p-8 text-center text-gray-400 italic">
                    {filters.filterType === '' ? 'দয়া করে একটি ফিল্টার সিলেক্ট করুন' : 'কোন তথ্য পাওয়া যায়নি'}
                  </td>
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
            <p className={`text-xl font-bold ${type === 'general' ? 'text-blue-800' : 'text-purple-800'}`}>{formatCurrency(savings.reduce((acc, s) => acc + s.amount, 0))}</p>
          </div>
          <div className="text-center border-l border-gray-200">
            <p className={`text-xs font-bold uppercase ${type === 'general' ? 'text-blue-600' : 'text-purple-600'}`}>মোট মুনাফা</p>
            <p className={`text-xl font-bold ${type === 'general' ? 'text-blue-800' : 'text-purple-800'}`}>{formatCurrency(savings.reduce((acc, s) => acc + s.profit, 0))}</p>
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
                  <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(idx + 1)}</td>
                  <td className="border border-gray-300 p-2 text-center">{formatDate(saving.date)}</td>
                  <td className="border border-gray-300 p-2 font-bold">{saving.customer_name}</td>
                  <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(saving.account_no)}</td>
                  <td className="border border-gray-300 p-2 text-right font-bold">{formatCurrency(saving.amount)}</td>
                  <td className="border border-gray-300 p-2 text-right text-emerald-600 font-bold">{formatCurrency(saving.profit)}</td>
                  <td className="border border-gray-300 p-2 text-center">{saving.description}</td>
                </tr>
              ))}
              {savings.length === 0 && (
                <tr>
                  <td colSpan={7} className="border border-gray-300 p-8 text-center text-gray-400 italic">
                    {filters.filterType === '' ? 'দয়া করে একটি ফিল্টার সিলেক্ট করুন' : 'কোন তথ্য পাওয়া যায়নি'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const OutstandingListView = () => {
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');

    useEffect(() => {
      if (outstandingBalances.length > 0 && !filterMonth && !filterYear) {
        const latest = new Date(outstandingBalances[0].date);
        setFilterMonth((latest.getMonth() + 1).toString().padStart(2, '0'));
        setFilterYear(latest.getFullYear().toString());
      }
    }, [outstandingBalances]);

    const filteredBalances = outstandingBalances.filter(item => {
      const date = new Date(item.date);
      const monthMatch = filterMonth === '' || (date.getMonth() + 1).toString().padStart(2, '0') === filterMonth;
      const yearMatch = filterYear === '' || date.getFullYear().toString() === filterYear;
      return monthMatch && yearMatch;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <HandCoins className="text-emerald-600" /> বকেয়া মাঠে আছে
          </h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-600">মাস:</label>
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="p-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">সব মাস</option>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-600">বছর:</label>
              <input 
                type="number"
                placeholder="বছর (যেমন: ২০২৪)"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="p-2 rounded-lg border border-gray-200 text-sm w-24 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <ExcelHeader 
            title="বকেয়া মাঠে আছে" 
            societyInfo={societyInfo} 
          />
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-3 text-left">মাসের নাম</th>
                  <th className="border p-3 text-left">বছর</th>
                  <th className="border p-3 text-right">টাকার পরিমান</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.length > 0 ? filteredBalances.map(item => {
                  const date = new Date(item.date);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="border p-3">{months.find(m => m.value === (date.getMonth() + 1).toString().padStart(2, '0'))?.label}</td>
                      <td className="border p-3">{toBengaliNumber(date.getFullYear().toString())}</td>
                      <td className="border p-3 text-right font-bold text-emerald-700">{formatCurrency(item.amount)}</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={3} className="border p-8 text-center text-gray-400 italic">কোন তথ্য পাওয়া যায়নি</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const ReportsView = () => {
    const [reportFilters, setReportFilters] = useState({ month: reports[0]?.month || '', year: reports[0]?.year || new Date().getFullYear().toString() });
    
    const selectedReport = reports.find(r => r.month === reportFilters.month && r.year === reportFilters.year) || reports[0];

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Search className="text-emerald-600" /> মাসিক রিপোর্ট
          </h2>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-wrap gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1">মাস</label>
              <select 
                value={reportFilters.month}
                onChange={(e) => setReportFilters(prev => ({ ...prev, month: e.target.value }))}
                className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {months.filter(m => m.value !== '').map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-gray-500 mb-1">বছর</label>
              <input 
                type="text"
                value={reportFilters.year}
                onChange={(e) => setReportFilters(prev => ({ ...prev, year: e.target.value }))}
                className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="বছর..."
              />
            </div>
          </div>

          {selectedReport ? (
            <div className="space-y-8">
              <ExcelHeader 
                title={`${months.find(m => m.value === selectedReport.month)?.label} - ${toBengaliNumber(selectedReport.year)} এর মাসিক রিপোর্ট`} 
                societyInfo={societyInfo} 
              />
              
              <div className="space-y-6">
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                  <h4 className="font-bold text-emerald-800 border-b border-emerald-200 pb-2 mb-4">প্রারম্ভিক স্থিতি</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-emerald-100 last:border-0">
                      <span className="text-gray-600">গত মাসের অবশিষ্ট ক্যাশ টাকা</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(selectedReport.prev_month_cash)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-emerald-100 last:border-0">
                      <span className="text-gray-600">গত মাসের অবশিষ্ট ব্যাংক স্থিতি</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(selectedReport.prev_month_bank)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                  <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4">আদায়/উত্তোলন</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                      <span className="text-gray-600">মোট কিস্তি আদায়</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedReport.total_installment_coll)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                      <span className="text-gray-600">মোট সঞ্চয় আদায়</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedReport.total_savings_coll)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                      <span className="text-gray-600">সার্ভিস চার্জ আদায়</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedReport.service_charge_coll)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                      <span className="text-gray-600">নতুন একাউন্ট খোলা বাবদ আয়</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedReport.new_account_income)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                      <span className="text-gray-600">ঋণ খেলাপি জরিমানা</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedReport.loan_profile_sale)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                      <span className="text-gray-600">পরিচালকদের জমা</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedReport.director_deposit)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-0">
                      <span className="text-gray-600">অফিস ঋণ গ্রহণ</span>
                      <span className="font-bold text-blue-700">{formatCurrency(selectedReport.office_loan_received)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 mt-2 border-t-2 border-blue-200">
                      <span className="text-blue-900 font-bold">মোট আদায়</span>
                      <span className="font-bold text-blue-900">{formatCurrency(
                        Number(selectedReport.total_installment_coll) + 
                        Number(selectedReport.total_savings_coll) + 
                        Number(selectedReport.service_charge_coll) + 
                        Number(selectedReport.new_account_income) + 
                        Number(selectedReport.loan_profile_sale) + 
                        Number(selectedReport.director_deposit) + 
                        Number(selectedReport.office_loan_received)
                      )}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                  <h4 className="font-bold text-red-800 border-b border-red-200 pb-2 mb-4">ব্যয়/প্রদান</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                      <span className="text-gray-600">নতুন বিনিয়োগ প্রদান</span>
                      <span className="font-bold text-red-700">{formatCurrency(selectedReport.new_investment_pay)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                      <span className="text-gray-600">সাধারণ সঞ্চয় প্রদান</span>
                      <span className="font-bold text-red-700">{formatCurrency(selectedReport.general_savings_pay)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                      <span className="text-gray-600">ডিপিএস (DPS) প্রদান</span>
                      <span className="font-bold text-red-700">{formatCurrency(selectedReport.dps_pay)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                      <span className="text-gray-600">সাধারণ ব্যয়</span>
                      <span className="font-bold text-red-700">{formatCurrency(selectedReport.general_expense)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                      <span className="text-gray-600">পরিচালকদের উত্তোলন</span>
                      <span className="font-bold text-red-700">{formatCurrency(selectedReport.director_withdrawal)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-red-100 last:border-0">
                      <span className="text-gray-600">অফিস ঋণ পরিশোধ</span>
                      <span className="font-bold text-red-700">{formatCurrency(selectedReport.office_loan_repayment)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 mt-2 border-t-2 border-red-200">
                      <span className="text-red-900 font-bold">মোট ব্যয়</span>
                      <span className="font-bold text-red-900">{formatCurrency(
                        Number(selectedReport.new_investment_pay) + 
                        Number(selectedReport.general_savings_pay) + 
                        Number(selectedReport.dps_pay) + 
                        Number(selectedReport.general_expense) + 
                        Number(selectedReport.director_withdrawal) + 
                        Number(selectedReport.office_loan_repayment)
                      )}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                  <h4 className="font-bold text-amber-800 border-b border-amber-200 pb-2 mb-4">ব্যাংক লেনদেন</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-amber-100 last:border-0">
                      <span className="text-gray-600">ব্যাংক জমা</span>
                      <span className="font-bold text-amber-700">{formatCurrency(selectedReport.bank_deposit)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-amber-100 last:border-0">
                      <span className="text-gray-600">ব্যাংক উত্তোলন</span>
                      <span className="font-bold text-amber-700">{formatCurrency(selectedReport.bank_withdrawal)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl shadow-lg text-white">
                  <h4 className="font-bold text-emerald-400 border-b border-gray-700 pb-2 mb-4">সমাপনী স্থিতি</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">অবশিষ্ট ক্যাশ টাকা</span>
                      <span className="text-2xl font-black text-white">
                        {formatCurrency(
                          Number(selectedReport.prev_month_cash) + 
                          Number(selectedReport.total_installment_coll) + 
                          Number(selectedReport.total_savings_coll) + 
                          Number(selectedReport.service_charge_coll) + 
                          Number(selectedReport.new_account_income) + 
                          Number(selectedReport.loan_profile_sale) + 
                          Number(selectedReport.director_deposit) + 
                          Number(selectedReport.office_loan_received) + 
                          Number(selectedReport.bank_withdrawal) - 
                          Number(selectedReport.new_investment_pay) - 
                          Number(selectedReport.general_savings_pay) - 
                          Number(selectedReport.dps_pay) - 
                          Number(selectedReport.general_expense) - 
                          Number(selectedReport.director_withdrawal) - 
                          Number(selectedReport.office_loan_repayment) - 
                          Number(selectedReport.bank_deposit)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">অবশিষ্ট ব্যাংক স্থিতি</span>
                      <span className="text-2xl font-black text-white">
                        {formatCurrency(
                          Number(selectedReport.prev_month_bank) + 
                          Number(selectedReport.bank_deposit) - 
                          Number(selectedReport.bank_withdrawal)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400 italic">
              এই সময়ের জন্য কোন রিপোর্ট পাওয়া যায়নি
            </div>
          )}
        </div>
      </div>
    );
  };

  const ReportForm = ({ editingReport, reports, onSave, onCancel, formKey }: { 
    editingReport: Report | null, 
    reports: Report[], 
    onSave: (e: React.FormEvent<HTMLFormElement>) => void, 
    onCancel: () => void,
    formKey: number
  }) => {
    const [selectedMonth, setSelectedMonth] = useState(editingReport?.month || '');
    const [selectedYear, setSelectedYear] = useState(editingReport?.year || new Date().getFullYear().toString());
    const [prevMonthData, setPrevMonthData] = useState({ cash: 0, bank: 0 });

    useEffect(() => {
      if (selectedMonth && selectedYear && !editingReport) {
        const prev = getPrevMonth(selectedMonth, selectedYear);
        const prevReport = reports.find(r => r.month === prev.month && r.year === prev.year);
        if (prevReport) {
          const remCash = Number(prevReport.prev_month_cash) + 
            Number(prevReport.total_installment_coll) + 
            Number(prevReport.total_savings_coll) + 
            Number(prevReport.service_charge_coll) + 
            Number(prevReport.new_account_income) + 
            Number(prevReport.loan_profile_sale) + 
            Number(prevReport.director_deposit) + 
            Number(prevReport.office_loan_received) + 
            Number(prevReport.bank_withdrawal) - 
            Number(prevReport.new_investment_pay) - 
            Number(prevReport.general_savings_pay) - 
            Number(prevReport.dps_pay) - 
            Number(prevReport.general_expense) - 
            Number(prevReport.director_withdrawal) - 
            Number(prevReport.office_loan_repayment) - 
            Number(prevReport.bank_deposit);
          
          const remBank = Number(prevReport.prev_month_bank) + 
            Number(prevReport.bank_deposit) - 
            Number(prevReport.bank_withdrawal);
            
          setPrevMonthData({ cash: remCash, bank: remBank });
        } else {
          setPrevMonthData({ cash: 0, bank: 0 });
        }
      }
    }, [selectedMonth, selectedYear, editingReport, reports]);

    return (
      <form key={formKey} onSubmit={onSave} className="space-y-6">
        <h3 className="text-lg font-bold text-gray-800 border-b pb-2">{editingReport ? 'রিপোর্ট এডিট করুন' : 'নতুন মাসিক রিপোর্ট তৈরি'}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">মাসের নাম</label>
            <select 
              required 
              name="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">সিলেক্ট করুন</option>
              {months.filter(m => m.value !== '').map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">বছর</label>
            <input 
              required 
              name="year" 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              type="text" 
              className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="space-y-4">
            <h4 className="font-bold text-emerald-700 border-b border-emerald-100 pb-1">প্রারম্ভিক স্থিতি</h4>
            <CurrencyInput name="prev_month_cash" defaultValue={editingReport?.prev_month_cash ?? prevMonthData.cash} label="গত মাসের অবশিষ্ট ক্যাশ টাকা" />
            <CurrencyInput name="prev_month_bank" defaultValue={editingReport?.prev_month_bank ?? prevMonthData.bank} label="গত মাসের অবশিষ্ট ব্যাংক স্থিতি" />
            
            <h4 className="font-bold text-blue-700 border-b border-blue-100 pb-1 pt-2">আদায়/উত্তোলন</h4>
            <CurrencyInput name="total_installment_coll" defaultValue={editingReport?.total_installment_coll} label="মোট কিস্তি আদায়" />
            <CurrencyInput name="total_savings_coll" defaultValue={editingReport?.total_savings_coll} label="মোট সঞ্চয় আদায়" />
            <CurrencyInput name="service_charge_coll" defaultValue={editingReport?.service_charge_coll} label="সার্ভিস চার্জ আদায়" />
            <CurrencyInput name="new_account_income" defaultValue={editingReport?.new_account_income} label="নতুন একাউন্ট খোলা বাবদ আয়" />
            <CurrencyInput name="loan_profile_sale" defaultValue={editingReport?.loan_profile_sale} label="ঋণ খেলাপি জরিমানা" />
            <CurrencyInput name="director_deposit" defaultValue={editingReport?.director_deposit} label="পরিচালকদের জমা" />
            <CurrencyInput name="office_loan_received" defaultValue={editingReport?.office_loan_received} label="অফিস ঋণ গ্রহণ" />
          </div>
          
          <div className="space-y-4">
            <h4 className="font-bold text-red-700 border-b border-red-100 pb-1">ব্যয়/প্রদান</h4>
            <CurrencyInput name="new_investment_pay" defaultValue={editingReport?.new_investment_pay} label="নতুন বিনিয়োগ প্রদান" />
            <CurrencyInput name="general_savings_pay" defaultValue={editingReport?.general_savings_pay} label="সাধারণ সঞ্চয় প্রদান" />
            <CurrencyInput name="dps_pay" defaultValue={editingReport?.dps_pay} label="ডিপিএস (DPS) প্রদান" />
            <CurrencyInput name="general_expense" defaultValue={editingReport?.general_expense} label="সাধারণ ব্যয়" />
            <CurrencyInput name="director_withdrawal" defaultValue={editingReport?.director_withdrawal} label="পরিচালকদের উত্তোলন" />
            <CurrencyInput name="office_loan_repayment" defaultValue={editingReport?.office_loan_repayment} label="অফিস ঋণ পরিশোধ" />
            
            <h4 className="font-bold text-gray-700 border-b border-gray-100 pb-1 pt-2">ব্যাংক লেনদেন</h4>
            <CurrencyInput name="bank_deposit" defaultValue={editingReport?.bank_deposit} label="ব্যাংক জমা" />
            <CurrencyInput name="bank_withdrawal" defaultValue={editingReport?.bank_withdrawal} label="ব্যাংক উত্তোলন" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
          <button type="submit" className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">{editingReport ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
        </div>
      </form>
    );
  };

  const renderOutstandingBalanceForm = () => (
    <form key={formKey} onSubmit={handleSaveOutstanding} className="space-y-6">
      <h3 className="text-lg font-bold text-gray-800 border-b pb-2">{editingOutstanding ? 'বকেয়া স্থিতি এডিট করুন' : 'নতুন বকেয়া স্থিতি যোগ করুন'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CurrencyInput required name="amount" defaultValue={editingOutstanding?.amount} label="মাঠে বকেয়া স্থিতির পরিমান" />
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">তারিখ নির্বাচন করুন</label>
          <input 
            type="date" 
            name="date" 
            required 
            defaultValue={editingOutstanding?.date || new Date().toISOString().split('T')[0]}
            className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={() => { setShowForm(false); setEditingOutstanding(null); }} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
        <button type="submit" className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">{editingOutstanding ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );

  const renderAdmin = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <LayoutDashboard className="text-emerald-600" /> এডমিন প্যানেল
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setEditingLoan(null); setAdminFormType('loan'); setFormKey(Date.now()); setShowForm(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> বিনিয়োগ
          </button>
          <button 
            onClick={() => { setEditingSaving(null); setAdminFormType('general_saving'); setFormKey(Date.now()); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> সাধারণ সঞ্চয়
          </button>
          <button 
            onClick={() => { setEditingSaving(null); setAdminFormType('monthly_saving'); setFormKey(Date.now()); setShowForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> ডিপিএস
          </button>
          <button 
            onClick={() => { setEditingReport(null); setAdminFormType('report'); setFormKey(Date.now()); setShowForm(true); }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> রিপোর্ট
          </button>
          <button 
            onClick={() => { setEditingOutstanding(null); setAdminFormType('outstanding'); setFormKey(Date.now()); setShowForm(true); }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> বকেয়া
          </button>
          <button 
            onClick={() => { setEditingOutstandingMonthlyReport(null); setAdminFormType('outstanding_monthly'); setFormKey(Date.now()); setShowForm(true); }}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm"
          >
            <Plus size={16} /> বকেয়া প্রতিবেদন
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
          onClick={() => setActiveAdminTab('reports')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'reports' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          মাসিক রিপোর্ট ব্যবস্থাপনা
        </button>
        <button 
          onClick={() => setActiveAdminTab('outstanding')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'outstanding' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          বকেয়া স্থিতি ব্যবস্থাপনা
        </button>
        <button 
          onClick={() => setActiveAdminTab('outstanding_monthly')}
          className={`px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'outstanding_monthly' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          বকেয়া মাসিক প্রতিবেদন ব্যবস্থাপনা
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
                    <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(loan.account_no)}</td>
                    <td className="border border-gray-300 p-2 font-bold">{loan.customer_name}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(loan.amount)}</td>
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
                          onClick={() => { setEditingLoan(loan); setAdminFormType('loan'); setFormKey(Date.now()); setShowForm(true); }}
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
                    <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(saving.account_no)}</td>
                    <td className="border border-gray-300 p-2 font-bold">{saving.customer_name}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(saving.amount)}</td>
                    <td className="border border-gray-300 p-2 text-center">{formatDate(saving.date)}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingSaving(saving); setAdminFormType(saving.type === 'general' ? 'general_saving' : 'monthly_saving'); setFormKey(Date.now()); setShowForm(true); }}
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
                {savings.filter(s => activeAdminTab === 'general_savings' ? s.type === 'general' : s.type === 'monthly').length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন তথ্য পাওয়া যায়নি</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminTab === 'reports' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">মাস</th>
                  <th className="border border-gray-300 p-2">বছর</th>
                  <th className="border border-gray-300 p-2">অবশিষ্ট ক্যাশ</th>
                  <th className="border border-gray-300 p-2">ব্যাংক স্থিতি</th>
                  <th className="border border-gray-300 p-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(report => {
                  const remCash = Number(report.prev_month_cash) + 
                    Number(report.total_installment_coll) + 
                    Number(report.total_savings_coll) + 
                    Number(report.service_charge_coll) + 
                    Number(report.new_account_income) + 
                    Number(report.loan_profile_sale) + 
                    Number(report.director_deposit) + 
                    Number(report.office_loan_received) + 
                    Number(report.bank_withdrawal) - 
                    Number(report.new_investment_pay) - 
                    Number(report.general_savings_pay) - 
                    Number(report.dps_pay) - 
                    Number(report.general_expense) - 
                    Number(report.director_withdrawal) - 
                    Number(report.office_loan_repayment) - 
                    Number(report.bank_deposit);
                  
                  const remBank = Number(report.prev_month_bank) + 
                    Number(report.bank_deposit) - 
                    Number(report.bank_withdrawal);

                  return (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center">{months.find(m => m.value === report.month)?.label}</td>
                      <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(report.year)}</td>
                      <td className="border border-gray-300 p-2 text-right font-bold">{formatCurrency(remCash)}</td>
                      <td className="border border-gray-300 p-2 text-right font-bold">{formatCurrency(remBank)}</td>
                      <td className="border border-gray-300 p-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => { setEditingReport(report); setAdminFormType('report'); setFormKey(Date.now()); setShowForm(true); }}
                            className="text-blue-600 hover:text-blue-800 font-bold"
                          >
                            এডিট
                          </button>
                          <button 
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            মুছুন
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন রিপোর্ট পাওয়া যায়নি</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminTab === 'outstanding' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">পরিমাণ</th>
                  <th className="border border-gray-300 p-2">তারিখ</th>
                  <th className="border border-gray-300 p-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {outstandingBalances.length > 0 ? outstandingBalances.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-right font-bold">{formatCurrency(item.amount)}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      {item.date ? formatDate(item.date) : (item.created_at?.toDate ? formatDate(item.created_at.toDate().toISOString().split('T')[0]) : '---')}
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingOutstanding(item); setAdminFormType('outstanding'); setFormKey(Date.now()); setShowForm(true); }}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          এডিট
                        </button>
                        <button 
                          onClick={() => handleDeleteOutstanding(item.id)}
                          className="text-red-600 hover:text-red-800 font-bold"
                        >
                          মুছুন
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন তথ্য পাওয়া যায়নি</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminTab === 'outstanding_monthly' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">মাস</th>
                  <th className="border border-gray-300 p-2">বছর</th>
                  <th className="border border-gray-300 p-2">মাঠে বকেয়া</th>
                  <th className="border border-gray-300 p-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {outstandingMonthlyReports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-center">{months.find(m => m.value === report.month)?.label}</td>
                    <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(report.year)}</td>
                    <td className="border border-gray-300 p-2 text-right font-bold">{formatCurrency(report.actually_in_field)}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingOutstandingMonthlyReport(report); setAdminFormType('outstanding_monthly'); setFormKey(Date.now()); setShowForm(true); }}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          এডিট
                        </button>
                        <button 
                          onClick={() => handleDeleteOutstandingMonthlyReport(report.id)}
                          className="text-red-600 hover:text-red-800 font-bold"
                        >
                          মুছুন
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {outstandingMonthlyReports.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন প্রতিবেদন পাওয়া যায়নি</td>
                  </tr>
                )}
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
          </div>
        )}
      </div>
    </div>
  );

  const renderLoanForm = () => (
    <form key={formKey} onSubmit={handleAddLoan} className="space-y-4">
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
          <CurrencyInput required name="amount" defaultValue={editingLoan?.amount} label="বিনিয়োগের পরিমান" />
        </div>
        <div>
          <CurrencyInput required name="total_with_profit" defaultValue={editingLoan?.total_with_profit} label="মুনাফাসহ মোট" />
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
    <form key={formKey} onSubmit={(e) => handleAddSaving(e, type)} className="space-y-4">
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
          <CurrencyInput required name="amount" defaultValue={editingSaving?.amount} label="টাকার পরিমাণ" />
        </div>
        {type === 'monthly' && (
          <div>
            <CurrencyInput name="profit" defaultValue={editingSaving?.profit} label="মুনাফা" />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">বিবরণ</label>
          <textarea name="description" defaultValue={editingSaving?.description} rows={2} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={() => { setShowForm(false); setEditingSaving(null); }} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
        <button type="submit" className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">{editingSaving ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-gray-900">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-gray-100 flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => setCurrentView('home')}>
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
          <NavItem active={currentView === 'reports'} icon={Search} label="মাসিক রিপোর্ট" onClick={() => setCurrentView('reports')} />
          <NavItem active={currentView === 'outstanding_list'} icon={HandCoins} label="বকেয়া মাঠে আছে" onClick={() => setCurrentView('outstanding_list')} />
          <NavItem active={currentView === 'outstanding_monthly_report'} icon={FileText} label="বকেয়া মাসিক প্রতিবেদন" onClick={() => setCurrentView('outstanding_monthly_report')} />
          <NavItem active={currentView === 'admin' || currentView === 'login'} icon={Filter} label="এডমিন প্যানেল" onClick={() => {
            if (isLoggedIn) setCurrentView('admin');
            else setCurrentView('login');
          }} />
        </nav>

        <div className="mt-auto bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-2">সহযোগিতার জন্য</p>
          <p className="text-sm font-medium flex items-center gap-2 text-emerald-800">
            <Phone size={14} /> ০১৩০০-৫৯৪৫২২
          </p>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
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
            <NavItem active={currentView === 'reports'} icon={Search} label="মাসিক রিপোর্ট" onClick={() => { setCurrentView('reports'); setIsMobileMenuOpen(false); }} />
            <NavItem active={currentView === 'outstanding_list'} icon={HandCoins} label="বকেয়া মাঠে আছে" onClick={() => { setCurrentView('outstanding_list'); setIsMobileMenuOpen(false); }} />
            <NavItem active={currentView === 'outstanding_monthly_report'} icon={FileText} label="বকেয়া মাসিক প্রতিবেদন" onClick={() => { setCurrentView('outstanding_monthly_report'); setIsMobileMenuOpen(false); }} />
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
        {currentView === 'home' && <Header societyInfo={societyInfo} logoUrl={settings.logo_url} onLogoClick={() => setCurrentView('home')} />}
        
        {fetchError && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold">তথ্য লোড করতে সমস্যা হয়েছে</p>
              <p className="text-sm opacity-80">{fetchError}</p>
            </div>
          </div>
        )}

        <div className="mt-4">
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
            {currentView === 'reports' && <ReportsView />}
            {currentView === 'outstanding_list' && <OutstandingListView />}
            {currentView === 'outstanding_monthly_report' && <OutstandingMonthlyReportView reports={outstandingMonthlyReports} societyInfo={societyInfo} />}
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
                  adminFormType === 'general_saving' ? 'bg-blue-600' : 
                  adminFormType === 'monthly_saving' ? 'bg-purple-600' :
                  adminFormType === 'report' ? 'bg-orange-600' : 
                  adminFormType === 'outstanding_monthly' ? 'bg-emerald-700' : 'bg-gray-600'
                ) : (
                  currentView === 'loans' ? 'bg-emerald-600' : 
                  currentView === 'general_savings' ? 'bg-blue-600' : 'bg-purple-600'
                )
              }`}>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Plus size={24} /> 
                  {currentView === 'admin' ? (
                    adminFormType === 'loan' ? 'নতুন বিনিয়োগ ফর্ম' : 
                    adminFormType === 'general_saving' ? 'সাধারণ সঞ্চয় ফর্ম' : 
                    adminFormType === 'monthly_saving' ? 'মাসিক সঞ্চয় (ডিপিএস) ফর্ম' :
                    adminFormType === 'report' ? 'মাসিক রিপোর্ট ফর্ম' : 
                    adminFormType === 'outstanding_monthly' ? 'বকেয়া মাসিক প্রতিবেদন ফর্ম' : 'বকেয়া স্থিতি ফর্ম'
                  ) : (
                    currentView === 'loans' ? 'নতুন বিনিয়োগ ফর্ম' : 
                    currentView === 'general_savings' ? 'সাধারণ সঞ্চয় ফর্ম' : 'মাসিক সঞ্চয় (ডিপিএস) ফর্ম'
                  )}
                </h3>
                <button onClick={() => { setShowForm(false); setEditingLoan(null); setEditingSaving(null); setEditingReport(null); setEditingOutstanding(null); setEditingOutstandingMonthlyReport(null); }} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 max-h-[80vh] overflow-y-auto">
                {currentView === 'admin' ? (
                  adminFormType === 'loan' ? renderLoanForm() : 
                  adminFormType === 'general_saving' ? renderSavingForm('general') : 
                  adminFormType === 'monthly_saving' ? renderSavingForm('monthly') :
                  adminFormType === 'report' ? (
                    <ReportForm 
                      editingReport={editingReport} 
                      reports={reports} 
                      onSave={handleSaveReport} 
                      onCancel={() => { setShowForm(false); setEditingReport(null); }} 
                      formKey={formKey}
                    />
                  ) : adminFormType === 'outstanding_monthly' ? (
                    <OutstandingMonthlyReportForm 
                      editingReport={editingOutstandingMonthlyReport}
                      onSave={handleSaveOutstandingMonthlyReport}
                      onCancel={() => { setShowForm(false); setEditingOutstandingMonthlyReport(null); }}
                      formKey={formKey}
                      outstandingBalances={outstandingBalances}
                      loans={loans}
                      reports={reports}
                    />
                  ) : renderOutstandingBalanceForm()
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
