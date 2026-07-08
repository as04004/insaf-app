/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  HandCoins, 
  PiggyBank, 
  CalendarClock, 
  Plus, 
  Search, 
  FileText,
  Calendar,
  Menu, 
  X,
  MapPin,
  Phone,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  User,
  ArrowLeft,
  Eye,
  History,
  AlertTriangle
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

import { App as CapApp } from '@capacitor/app';
import { RiskyLoansManagement, RiskyInstallmentCollection } from './components/RiskyLoansComponents';

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

interface RiponTransaction {
  id: string;
  date: string;
  note: string;
  amount: number;
  type: 'receive' | 'payment';
  created_at: any;
}

interface Landlord {
  id: string;
  name: string;
  mobile: string;
  address: string;
  created_at: any;
}

interface OfficeRent {
  id: string;
  landlord_id: string;
  landlord_name: string;
  payment_date: string;
  rent_month: string;
  amount: number;
  payer_name: string;
  receiver_name?: string;
  remarks: string;
  created_at: any;
}

interface RiskyLoan {
  id: string;
  customer_name: string;
  account_no: string;
  father_name: string;
  mobile_no: string;
  address: string;
  guarantor_name: string;
  amount: number;
  total_with_profit: number;
  total_paid: number;
  total_due: number;
  penalty: number;
  total_due_with_penalty: number;
  savings_deposit: number;
  last_payment_date: string;
  last_payment_amount: number;
  start_date: string;
  end_date: string;
  status: 'অনিয়মিত ঋণগ্রহীতা' | 'ঋণ খেলাপি' | 'পরিশোধিত';
  created_at: any;
  photo_url?: string;
}

interface RiskyInstallment {
  id: string;
  account_no: string;
  customer_name: string;
  amount: number;
  date: string;
  note: string;
  created_at: any;
}

type View = 'home' | 'loans' | 'general_savings' | 'monthly_savings' | 'reports' | 'outstanding_list' | 'outstanding_monthly_report' | 'office_rents' | 'landlord_list' | 'office_rent_report' | 'admin' | 'login' | 'risky_investments';

// --- Components ---

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
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 whitespace-nowrap">{societyInfo.name}</h1>
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
    <h1 className="text-blue-700 text-base sm:text-xl font-bold whitespace-nowrap">{societyInfo.name}</h1>
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
          <option value="year">বছর অনুযায়ী দেখুন</option>
          <option value="month">মাস অনুযায়ী দেখুন</option>
          <option value="account">একাউন্ট অনুযায়ী দেখুন</option>
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

const getDirectGoogleDriveImageUrl = (url?: string) => {
  if (!url) return '';
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
};

const sortOfficeRentsByMonth = (rents: OfficeRent[]) => {
  const parsedMonthsMap: { [key: string]: number } = {
    'জানুয়ারি': 1, 'ফেব্রুয়ারি': 2, 'মার্চ': 3, 'এপ্রিল': 4, 'মে': 5, 'জুন': 6,
    'জুলাই': 7, 'আগস্ট': 8, 'সেপ্টেম্বর': 9, 'অক্টোবর': 10, 'নভেম্বর': 11, 'ডিসেম্বর': 12
  };

  const parseRentMonth = (rentMonthStr: string) => {
    if (!rentMonthStr) return null;
    let targetStr = rentMonthStr;
    if (rentMonthStr.includes(' হতে ')) {
      const parts = rentMonthStr.split(' হতে ');
      if (parts.length === 2) {
        targetStr = parts[1];
      }
    }
    const parts = targetStr.split('-');
    if (parts.length !== 2) return null;
    const mStr = parts[0];
    const yStr = toEnglishNumber(parts[1]);
    const mNum = parsedMonthsMap[mStr] || 0;
    const yNum = parseInt(yStr) || 0;
    if (mNum === 0 || yNum === 0) return null;
    return { month: mNum, year: yNum };
  };

  return [...rents].sort((a, b) => {
    const parsedA = parseRentMonth(a.rent_month);
    const parsedB = parseRentMonth(b.rent_month);
    
    if (parsedA && parsedB) {
      if (parsedA.year !== parsedB.year) {
        return parsedB.year - parsedA.year; // Latest year first
      }
      return parsedB.month - parsedA.month; // Latest month first
    }
    
    if (parsedA) return -1;
    if (parsedB) return 1;
    return 0;
  });
};

const getMonthsRange = (startMonthStr: string, startYearNum: number, endMonthStr: string, endYearNum: number) => {
  const monthNames = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const startMonthIdx = monthNames.indexOf(startMonthStr);
  const endMonthIdx = monthNames.indexOf(endMonthStr);
  
  const results: string[] = [];
  let currYear = startYearNum;
  let currMonthIdx = startMonthIdx;
  
  if (startMonthIdx === -1 || endMonthIdx === -1) return results;

  while (currYear < endYearNum || (currYear === endYearNum && currMonthIdx <= endMonthIdx)) {
    results.push(`${monthNames[currMonthIdx]}-${toBengaliNumber(currYear)}`);
    currMonthIdx++;
    if (currMonthIdx > 11) {
      currMonthIdx = 0;
      currYear++;
    }
  }
  return results;
};

const getRentBreakdown = (rent: OfficeRent) => {
  const rentMonthStr = rent.rent_month;
  const totalAmount = rent.amount;
  
  if (!rentMonthStr) return [];
  
  let months: string[] = [];
  if (rentMonthStr.includes(' হতে ')) {
    const parts = rentMonthStr.split(' হতে ');
    if (parts.length === 2) {
      const startParts = parts[0].split('-');
      const endParts = parts[1].split('-');
      if (startParts.length === 2 && endParts.length === 2) {
        const startMonth = startParts[0];
        const startYear = parseInt(toEnglishNumber(startParts[1])) || 2026;
        const endMonth = endParts[0];
        const endYear = parseInt(toEnglishNumber(endParts[1])) || 2026;
        
        months = getMonthsRange(startMonth, startYear, endMonth, endYear);
      }
    }
  }
  
  if (months.length === 0) {
    months = [rentMonthStr];
  }
  
  const amountPerMonth = totalAmount / months.length;
  
  return months.map((m, index) => ({
    serial: index + 1,
    month: m,
    amount: amountPerMonth
  }));
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
  { length: Math.max(currentYear - startYear + 5, 8) },
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

const useHorizontalScroll = () => {
  const elRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // 1. Wheel Scroll to Horizontal Scroll
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      
      const canScrollLeft = el.scrollLeft > 0;
      const canScrollRight = el.scrollLeft < (el.scrollWidth - el.clientWidth);
      
      if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.2;
      }
    };

    // 2. Drag-to-Scroll Support
    let isDown = false;
    let startX: number;
    let scrollLeft: number;
    let hasDragged = false;

    const onMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      hasDragged = false;
    };

    const onMouseLeave = () => {
      isDown = false;
    };

    const onMouseUp = (e: MouseEvent) => {
      isDown = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) {
        hasDragged = true;
      }
      el.scrollLeft = scrollLeft - walk;
    };

    const onClick = (e: MouseEvent) => {
      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('mouseup', onMouseUp, true);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('click', onClick, true);

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('mouseup', onMouseUp, true);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  return elRef;
};

// --- Main App Component ---

export default function App() {
  const adminBtnsRef = useHorizontalScroll();
  const adminTabsRef = useHorizontalScroll();
  const loansTableRef = useHorizontalScroll();
  const generalSavingsTableRef = useHorizontalScroll();
  const monthlySavingsTableRef = useHorizontalScroll();
  const reportsTableRef = useHorizontalScroll();
  const outstandingTableRef = useHorizontalScroll();
  const outstandingMonthlyTableRef = useHorizontalScroll();
  const officeRentsTableRef = useHorizontalScroll();
  const landlordsTableRef = useHorizontalScroll();
  const [currentView, setCurrentView] = useState<View>('home');
  const [viewHistory, setViewHistory] = useState<View[]>(['home']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ active, icon: Icon, label, view }: { active: boolean, icon: any, label: string, view: View }) => (
    <button 
      onClick={() => { navigateTo(view); setIsMobileMenuOpen(false); }}
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
  const [riponTransactions, setRiponTransactions] = useState<RiponTransaction[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [officeRents, setOfficeRents] = useState<OfficeRent[]>([]);
  const [riskyLoans, setRiskyLoans] = useState<RiskyLoan[]>([]);
  const [riskyInstallments, setRiskyInstallments] = useState<RiskyInstallment[]>([]);
  const [editingOfficeRent, setEditingOfficeRent] = useState<OfficeRent | null>(null);
  const [editingLandlord, setEditingLandlord] = useState<Landlord | null>(null);
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
  const [activeAdminTab, setActiveAdminTab] = useState<'loans' | 'general_savings' | 'monthly_savings' | 'reports' | 'outstanding' | 'outstanding_monthly' | 'office_rents' | 'landlords' | 'ripon_bhai' | 'settings' | 'risky_loans' | 'risky_installments'>('loans');
  const [adminFormType, setAdminFormType] = useState<'loan' | 'general_saving' | 'monthly_saving' | 'report' | 'outstanding' | 'outstanding_monthly' | 'office_rent' | 'landlord' | null>(null);
  const [showRiponForm, setShowRiponForm] = useState(false);

  const closeFormModal = () => {
    if (window.history.state?.modalOpen) {
      window.history.back();
    } else {
      setShowForm(false);
      setEditingLoan(null);
      setEditingSaving(null);
      setEditingReport(null);
      setEditingOutstanding(null);
      setEditingOutstandingMonthlyReport(null);
      setEditingOfficeRent(null);
      setEditingLandlord(null);
    }
  };

  const closeMobileMenu = () => {
    if (window.history.state?.menuOpen) {
      window.history.back();
    } else {
      setIsMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setShowForm(false);
      setEditingLoan(null);
      setEditingSaving(null);
      setEditingReport(null);
      setEditingOutstanding(null);
      setEditingOutstandingMonthlyReport(null);
      setEditingOfficeRent(null);
      setEditingLandlord(null);
    };

    if (showForm) {
      window.history.pushState({ modalOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showForm]);

  useEffect(() => {
    const handlePopState = () => {
      setIsMobileMenuOpen(false);
    };

    if (isMobileMenuOpen) {
      window.history.pushState({ menuOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMobileMenuOpen]);

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
    const dataViews: View[] = [
      'home', 'loans', 'general_savings', 'monthly_savings', 'reports', 
      'admin', 'office_rents', 'risky_investments', 'outstanding_list', 
      'outstanding_monthly_report', 'landlord_list', 'office_rent_report'
    ];
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

    const riponQuery = query(collection(db, 'ripon_transactions'), orderBy('date', 'desc'));
    const unsubscribeRipon = onSnapshot(riponQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiponTransaction));
      setRiponTransactions(data);
    });

    const landlordsQuery = query(collection(db, 'landlords'));
    const unsubscribeLandlords = onSnapshot(landlordsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Landlord));
      setLandlords(data);
    }, (error) => {
      console.error("Error fetching landlords:", error);
    });

    const officeRentsQuery = query(collection(db, 'office_rents'));
    const unsubscribeOfficeRents = onSnapshot(officeRentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfficeRent));
      setOfficeRents(data);
    }, (error) => {
      console.error("Error fetching office rents:", error);
    });

    const riskyLoansQuery = query(collection(db, 'risky_loans'));
    const unsubscribeRiskyLoans = onSnapshot(riskyLoansQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiskyLoan));
      setRiskyLoans(data);
    }, (error) => {
      console.error("Error fetching risky loans:", error);
    });

    const riskyInstallmentsQuery = query(collection(db, 'risky_installments'));
    const unsubscribeRiskyInstallments = onSnapshot(riskyInstallmentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiskyInstallment));
      setRiskyInstallments(data);
    }, (error) => {
      console.error("Error fetching risky installments:", error);
    });

    return () => {
      unsubscribeLoans();
      unsubscribeSavings();
      unsubscribeReports();
      unsubscribeOutstanding();
      unsubscribeMonthlyReports();
      unsubscribeRipon();
      unsubscribeLandlords();
      unsubscribeOfficeRents();
      unsubscribeRiskyLoans();
      unsubscribeRiskyInstallments();
    };
  }, [filters, currentView, isLoggedIn, activeAdminTab]);

  const navigateTo = (view: View) => {
    if (view !== currentView) {
      window.history.pushState({ view }, '', window.location.pathname);
      setViewHistory(prev => [...prev, view]);
      setCurrentView(view);
    }
  };

  useEffect(() => {
    // Push initial state if none exists
    if (!window.history.state) {
      window.history.replaceState({ view: 'home' }, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const handleBackButton = (e: PopStateEvent) => {
      if (e.state && e.state.view) {
        setCurrentView(e.state.view);
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handleBackButton);

    const backHandler = CapApp.addListener('backButton', ({ canGoBack }) => {
      const state = window.history.state;
      if (state && (state.modalOpen || state.menuOpen)) {
        window.history.back();
      } else if (currentView !== 'home') {
        window.history.back();
      } else {
        if (window.confirm('আপনি কি অ্যাপ থেকে বের হতে চান?')) {
          CapApp.exitApp();
        }
      }
    });

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      backHandler.then(h => h.remove());
    };
  }, [currentView]);

  const fetchData = async () => {
    // fetchData is now handled by onSnapshot, but we keep the function signature 
    // for compatibility with existing calls if any, though they won't do much.
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings && adminPassword === settings.admin_password) {
      setIsLoggedIn(true);
      navigateTo('admin');
    } else {
      alert('ভুল পাসওয়ার্ড');
    }
  };

  const handlePasswordChange = async (newPassword: string) => {
    if (!newPassword) return;
    try {
      await setDoc(doc(db, 'settings', 'app_settings'), {
        admin_password: newPassword
      }, { merge: true });
      
      const updatedSettings = { ...settings, admin_password: newPassword };
      setSettings(updatedSettings);
      localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
      
      alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে');
    } catch (error) {
      console.error("Error changing password:", error);
      alert('পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে');
    }
  };

  const compressLogo = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 400; // maximum width/height for optimized rendering and storing
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height = Math.round((height * max_size) / width);
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width = Math.round((width * max_size) / height);
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Export as PNG with alpha channel or JPEG to preserve small size
          const compressed = canvas.toDataURL('image/png');
          resolve(compressed);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressLogo(file);
      await setDoc(doc(db, 'settings', 'app_settings'), {
        logo_url: compressedBase64
      }, { merge: true });
      
      // Update local state and cache immediately for instantaneous feedback
      const updatedSettings = { ...settings, logo_url: compressedBase64 };
      setSettings(updatedSettings);
      localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
      
      alert('লোগো সফলভাবে আপলোড এবং সেভ করা হয়েছে');
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert('লোগো আপলোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
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
      closeFormModal();
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
      closeFormModal();
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
      closeFormModal();
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

  const handleDeleteOfficeRent = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই ভাড়ার হিসাবটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'office_rents', id));
      alert('সফলভাবে মুছে ফেলা হয়েছে');
    } catch (error: any) {
      console.error("Error deleting office rent:", error);
      alert('মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteLandlord = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই ঘর মালিককে মুছে ফেলতে চান?')) return;
    const associated = officeRents.some(r => r.landlord_id === id);
    if (associated) {
      alert('এই ঘর মালিকের অধীনে ভাড়ার হিসাব রয়েছে, তাই উনাকে মুছে ফেলা সম্ভব নয়।');
      return;
    }
    try {
      await deleteDoc(doc(db, 'landlords', id));
      alert('সফলভাবে মুছে ফেলা হয়েছে');
    } catch (error: any) {
      console.error("Error deleting landlord:", error);
      alert('মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const handleSaveOfficeRent = async (data: {
    payTogether: boolean;
    landlordId: string;
    landlordName: string;
    amount: number;
    payment_date: string;
    payer_name: string;
    receiver_name: string;
    remarks: string;
    rent_month?: string;
    startMonth?: string;
    startYear?: number;
    endMonth?: string;
    endYear?: number;
  }) => {
    try {
      const rentMonthValue = data.payTogether
        ? `${data.startMonth}-${toBengaliNumber(data.startYear || 2026)} হতে ${data.endMonth}-${toBengaliNumber(data.endYear || 2026)}`
        : (data.rent_month || '');

      if (data.payTogether) {
        const rentMonths = getMonthsRange(data.startMonth || '', data.startYear || 2026, data.endMonth || '', data.endYear || 2026);
        if (rentMonths.length === 0) {
          alert('ভাড়া মাসের সময়সীমা সঠিক নয়');
          return;
        }
      }

      const rentData: any = {
        landlord_id: data.landlordId,
        landlord_name: data.landlordName,
        amount: data.amount,
        payment_date: data.payment_date,
        rent_month: rentMonthValue,
        payer_name: data.payer_name,
        receiver_name: data.receiver_name,
        remarks: data.remarks,
        is_pay_together: data.payTogether,
        start_month: data.payTogether ? data.startMonth : null,
        start_year: data.payTogether ? data.startYear : null,
        end_month: data.payTogether ? data.endMonth : null,
        end_year: data.payTogether ? data.endYear : null,
      };

      if (editingOfficeRent) {
        await updateDoc(doc(db, 'office_rents', editingOfficeRent.id), {
          ...rentData,
          updated_at: serverTimestamp()
        });
        alert('অফিস ভাড়া সফলভাবে আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'office_rents'), {
          ...rentData,
          created_at: serverTimestamp()
        });
        alert('অফিস ভাড়া সফলভাবে সংরক্ষণ করা হয়েছে');
      }

      setEditingOfficeRent(null);
      closeFormModal();
      setFormKey(Date.now());
    } catch (error: any) {
      console.error("Error saving office rent:", error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে: ' + (error.message || 'অজানা সমস্যা'));
    }
  };

  const handleSaveLandlord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const mobile = formData.get('mobile') as string;
    const address = formData.get('address') as string;

    try {
      if (editingLandlord) {
        await updateDoc(doc(db, 'landlords', editingLandlord.id), {
          name,
          mobile,
          address,
          updated_at: serverTimestamp()
        });
        alert('ঘর মালিক সফলভাবে আপডেট করা হয়েছে');
      } else {
        await addDoc(collection(db, 'landlords'), {
          name,
          mobile,
          address,
          created_at: serverTimestamp()
        });
        alert('ঘর মালিক সফলভাবে সংরক্ষণ করা হয়েছে');
      }
      setEditingLandlord(null);
      closeFormModal();
      setFormKey(Date.now());
    } catch (error: any) {
      console.error("Error saving landlord:", error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে: ' + (error.message || 'অজানা সমস্যা'));
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
      closeFormModal();
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
      closeFormModal();
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

  const handleAddRiponTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount') as string) || 0;
    const date = formData.get('date') as string;
    const type = formData.get('type') as 'receive' | 'payment';
    const note = formData.get('note') as string;

    try {
      await addDoc(collection(db, 'ripon_transactions'), {
        amount,
        date,
        type,
        note,
        created_at: serverTimestamp()
      });
      alert('লেনদেন সফলভাবে যোগ করা হয়েছে');
      setShowRiponForm(false);
      form.reset();
    } catch (error) {
      console.error("Error adding ripon transaction:", error);
      alert('সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  };

  const handleDeleteRiponTransaction = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই লেনদেনটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'ripon_transactions', id));
      alert('মুছে ফেলা হয়েছে');
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert('মুছে ফেলতে সমস্যা হয়েছে');
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

    const latestReport = [...reports]
      .sort((a, b) => {
        const dateA = parseInt((a.year || "0") + (a.month || "0"));
        const dateB = parseInt((b.year || "0") + (b.month || "0"));
        return dateB - dateA;
      })[0];

    return (
      <div className="space-y-8">
        {/* Dashboard Header with Society Info */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-center">
          <ExcelHeader title="ড্যাশবোর্ড" societyInfo={societyInfo} />
        </div>

        {/* Risky Investments Banner Link */}
        <div 
          onClick={() => navigateTo('risky_investments')}
          className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-3xl shadow-sm border border-red-100 hover:border-red-300 transition-all cursor-pointer group flex items-center justify-between font-bangla"
        >
          <div className="flex items-center gap-4">
            <div className="bg-red-500 text-white p-3 sm:p-3.5 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
              <AlertTriangle size={24} className="animate-pulse" />
            </div>
            <div className="text-left">
              <h2 className="text-base sm:text-xl font-extrabold text-red-900 group-hover:text-red-700 transition-colors">ঝুঁকিপূর্ণ বিনিয়োগ ও ঋণ খেলাপি তালিকা</h2>
              <p className="text-[10px] sm:text-sm font-bold text-red-700/80 mt-0.5">অনিয়মিত ও ঋণ খেলাপি গ্রাহকদের তালিকা ও বিস্তারিত বিবরণী দেখতে এখানে ক্লিক করুন</p>
            </div>
          </div>
          <div className="bg-white p-2 rounded-full border border-red-100 shadow-xs text-red-600 group-hover:translate-x-1.5 transition-transform flex items-center justify-center">
            <ChevronRight size={18} />
          </div>
        </div>

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
              onClick={() => navigateTo('loans')}
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
                <div className="flex justify-between items-center text-[10px] text-black font-semibold mb-1">
                  <span className="text-black">একাউন্ট: {toBengaliNumber(loan.account_no)}</span>
                  <span className="text-black">তারিখ: {(() => {
                    if (!loan.start_date) return "N/A";
                    // Try to parse the date safely
                    let d = new Date(loan.start_date);
                    // If parsing fails directly, check if it's in dd-mm-yyyy
                    if (isNaN(d.getTime())) {
                       return toBengaliNumber(loan.start_date);
                    }
                    const day = d.getDate().toString().padStart(2, '0');
                    const month = (d.getMonth() + 1).toString().padStart(2, '0');
                    const year = d.getFullYear();
                    return toBengaliNumber(`${day}-${month}-${year}`);
                  })()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black font-bold">পরিমাণ</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(loan.amount)}</span>
                </div>
              </div>
            ))}
            {latestLoans.length === 0 && (
              <p className="text-gray-400 italic text-center py-4 col-span-2">কোন বিনিয়োগ তথ্য পাওয়া যায়নি</p>
            )}
          </div>
        </div>

        {/* Latest Monthly Report Section */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                <FileText size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">সর্বশেষ মাসের মাসিক রিপোর্ট</h2>
            </div>
            <button 
              onClick={() => navigateTo('reports')}
              className="text-blue-600 hover:text-blue-700 font-bold text-sm flex items-center gap-1 transition-colors"
            >
              সব দেখুন <ChevronRight size={16} />
            </button>
          </div>
          <button 
            onClick={() => navigateTo('reports')}
            className="w-full flex items-center justify-between p-6 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-all border border-blue-100 group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <div className="text-left">
                <p className="text-xs text-blue-500 font-bold uppercase tracking-wider mb-1">রিপোর্ট মাস ও বছর</p>
                <p className="text-xl font-bold text-blue-900">
                  {latestReport ? (
                    <>
                      {months.find(m => m.value === latestReport.month)?.label} {toBengaliNumber(latestReport.year || "")}
                    </>
                  ) : (
                    "কোন রিপোর্ট পাওয়া যায়নি"
                  )}
                </p>
              </div>
            </div>
            <div className="bg-blue-600 text-white p-2 rounded-full shadow-md shadow-blue-200">
              <ChevronRight size={20} />
            </div>
          </button>
        </div>

        {/* Outstanding Balance Section */}
        {latestOutstanding && (
          <button 
            onClick={() => navigateTo('outstanding_list')}
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
                <p className="text-base sm:text-lg text-gray-700 font-medium whitespace-nowrap">{societyInfo.name}</p>
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

        <div className="overflow-x-auto p-px">
          <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FCE4D6]">
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">ক্রমিক নং</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-left">গ্রাহকের নাম</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">একাউন্ট নং</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">গ্রাহকের মোবাইল নং</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-left">জামিনদারের নাম</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">জামিনদারের মোবাইল নং</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">বিনিয়োগের পরিমান</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">মুনাফাসহ মোট</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">বিনিয়োগ প্রদানের তারিখ</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">মেয়াদ শেষ হবার তারিখ</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">স্টাটাস</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, idx) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{toBengaliNumber(idx + 1)}</td>
                  <td className="border border-gray-300 p-2 font-bold text-left whitespace-nowrap">{loan.customer_name}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{toBengaliNumber(loan.account_no)}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{toBengaliNumber(loan.mobile_no || '----------')}</td>
                  <td className="border border-gray-300 p-2 text-left whitespace-nowrap">{loan.guarantor_name || '----------'}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{loan.guarantor_mobile_no || '----------'}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap">{formatCurrency(loan.amount)}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap">{formatCurrency(loan.total_with_profit)}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{formatDate(loan.start_date)}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{formatDate(loan.end_date)}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">
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
          <table className="w-full border-collapse border border-gray-300 text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#E2EFDA]">
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">ক্রমিক নং</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">তারিখ</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-left">গ্রাহকের নাম</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">একাউন্ট নং</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">জমাকৃত টাকার পরিমাণ</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">মুনাফা</th>
                <th className="border border-gray-400 p-2 whitespace-nowrap text-center">বিবরণ</th>
              </tr>
            </thead>
            <tbody>
              {savings.map((saving, idx) => (
                <tr key={saving.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{toBengaliNumber(idx + 1)}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{formatDate(saving.date)}</td>
                  <td className="border border-gray-300 p-2 font-bold text-left whitespace-nowrap">{saving.customer_name}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{toBengaliNumber(saving.account_no)}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap">{formatCurrency(saving.amount)}</td>
                  <td className="border border-gray-300 p-2 text-center text-emerald-600 font-bold whitespace-nowrap">{formatCurrency(saving.profit)}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{saving.description}</td>
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
                  <th className="border p-3 text-center">টাকার পরিমান</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.length > 0 ? filteredBalances.map(item => {
                  const date = new Date(item.date);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="border p-3">{months.find(m => m.value === (date.getMonth() + 1).toString().padStart(2, '0'))?.label}</td>
                      <td className="border p-3">{toBengaliNumber(date.getFullYear().toString())}</td>
                      <td className="border p-3 text-center font-bold text-emerald-700">{formatCurrency(item.amount)}</td>
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
        <button type="button" onClick={closeFormModal} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
        <button type="submit" className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">{editingOutstanding ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );

  const renderAdmin = () => (
    <div className="space-y-6">
      {activeAdminTab !== 'ripon_bhai' && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-center mb-6">
          <ExcelHeader title="এডমিন প্যানেল" societyInfo={societyInfo} />
        </div>
      )}
      {activeAdminTab !== 'ripon_bhai' && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 shrink-0">
              <LayoutDashboard className="text-emerald-600" /> এডমিন প্যানেল
            </h2>
            <div className="flex-1 max-w-full overflow-hidden">
              <div ref={adminBtnsRef} className="flex overflow-x-auto desktop-scrollbar gap-2 pb-3 -mx-1 px-1 cursor-grab active:cursor-grabbing select-none scroll-smooth">
                <button 
                  onClick={() => { setEditingLoan(null); setAdminFormType('loan'); setFormKey(Date.now()); setShowForm(true); }}
                  className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} /> বিনিয়োগ
                </button>
                <button 
                  onClick={() => { setEditingSaving(null); setAdminFormType('general_saving'); setFormKey(Date.now()); setShowForm(true); }}
                  className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} /> সাধারণ সঞ্চয়
                </button>
                <button 
                  onClick={() => { setEditingSaving(null); setAdminFormType('monthly_saving'); setFormKey(Date.now()); setShowForm(true); }}
                  className="whitespace-nowrap bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} /> ডিপিএস
                </button>
                <button 
                  onClick={() => { setEditingReport(null); setAdminFormType('report'); setFormKey(Date.now()); setShowForm(true); }}
                  className="whitespace-nowrap bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} /> রিপোর্ট
                </button>
                <button 
                  onClick={() => { setEditingOutstanding(null); setAdminFormType('outstanding'); setFormKey(Date.now()); setShowForm(true); }}
                  className="whitespace-nowrap bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} /> বকেয়া
                </button>
                <button 
                  onClick={() => { setEditingOutstandingMonthlyReport(null); setAdminFormType('outstanding_monthly'); setFormKey(Date.now()); setShowForm(true); }}
                  className="whitespace-nowrap bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} /> বকেয়া প্রতিবেদন
                </button>
                <button 
                  onClick={() => { setEditingOfficeRent(null); setAdminFormType('office_rent'); setFormKey(Date.now()); setShowForm(true); }}
                  className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} /> এড অফিস ভাড়া
                </button>
                <button 
                  onClick={() => { setEditingLandlord(null); setAdminFormType('landlord'); setFormKey(Date.now()); setShowForm(true); }}
                  className="whitespace-nowrap bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Plus size={16} /> এড ঘর মালিক
                </button>
                <button 
                  onClick={() => setActiveAdminTab('ripon_bhai')}
                  className="whitespace-nowrap bg-pink-600 hover:bg-pink-700 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <User size={16} /> রিপন ভাই
                </button>
              </div>
            </div>
          </div>

          <FilterBar 
            filters={filters} 
            onFiltersChange={(updates) => setFilters(prev => ({ ...prev, ...updates }))} 
          />

          <div className="overflow-hidden mt-4">
            <div ref={adminTabsRef} className="flex overflow-x-auto desktop-scrollbar border-b border-gray-200 cursor-grab active:cursor-grabbing select-none scroll-smooth pb-1">
              <button 
                onClick={() => setActiveAdminTab('loans')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'loans' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                বিনিয়োগ ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('general_savings')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'general_savings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                সাধারণ সঞ্চয় ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('monthly_savings')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'monthly_savings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                ডিপিএস ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('reports')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'reports' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                মাসিক রিপোর্ট ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('outstanding')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'outstanding' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                বকেয়া স্থিতি ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('outstanding_monthly')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'outstanding_monthly' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                বকেয়া মাসিক প্রতিবেদন ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('office_rents')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'office_rents' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                অফিস ভাড়া ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('landlords')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'landlords' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                ঘর মালিক ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('risky_loans')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'risky_loans' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                ঝুঁকিপূর্ণ ঋণ ব্যবস্থাপনা
              </button>
              <button 
                onClick={() => setActiveAdminTab('risky_installments')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'risky_installments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                কিস্তি আদায় (ঝুঁকিপূর্ণ)
              </button>
              <button 
                onClick={() => setActiveAdminTab('settings')}
                className={`whitespace-nowrap px-6 py-3 text-sm font-bold transition-colors border-b-2 ${activeAdminTab === 'settings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                সেটিংস
              </button>
            </div>
          </div>
        </>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeAdminTab === 'loans' && (
          <div ref={loansTableRef} className="overflow-x-auto cursor-grab active:cursor-grabbing desktop-scrollbar pb-2">
            <table className="min-w-[800px] w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">একাউন্ট নং</th>
                  <th className="border border-gray-300 p-2">নাম</th>
                  <th className="border border-gray-300 p-2 text-center">পরিমাণ</th>
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
                    <td className="border border-gray-300 p-2 text-center">{formatCurrency(loan.amount)}</td>
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
          <div ref={activeAdminTab === 'general_savings' ? generalSavingsTableRef : monthlySavingsTableRef} className="overflow-x-auto cursor-grab active:cursor-grabbing desktop-scrollbar pb-2">
            <table className="min-w-[700px] w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">একাউন্ট নং</th>
                  <th className="border border-gray-300 p-2">নাম</th>
                  <th className="border border-gray-300 p-2 text-center">পরিমাণ</th>
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
                    <td className="border border-gray-300 p-2 text-center">{formatCurrency(saving.amount)}</td>
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
          <div ref={reportsTableRef} className="overflow-x-auto cursor-grab active:cursor-grabbing desktop-scrollbar pb-2">
            <table className="min-w-[800px] w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">মাস</th>
                  <th className="border border-gray-300 p-2">বছর</th>
                  <th className="border border-gray-300 p-2 text-center">অবশিষ্ট ক্যাশ</th>
                  <th className="border border-gray-300 p-2 text-center">ব্যাংক স্থিতি</th>
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
                      <td className="border border-gray-300 p-2 text-center font-bold">{formatCurrency(remCash)}</td>
                      <td className="border border-gray-300 p-2 text-center font-bold">{formatCurrency(remBank)}</td>
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
          <div ref={outstandingTableRef} className="overflow-x-auto cursor-grab active:cursor-grabbing desktop-scrollbar pb-2">
            <table className="min-w-[500px] w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-center">পরিমাণ</th>
                  <th className="border border-gray-300 p-2">তারিখ</th>
                  <th className="border border-gray-300 p-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {outstandingBalances.length > 0 ? outstandingBalances.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-center font-bold">{formatCurrency(item.amount)}</td>
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
          <div ref={outstandingMonthlyTableRef} className="overflow-x-auto cursor-grab active:cursor-grabbing desktop-scrollbar pb-2">
            <table className="min-w-[550px] w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">মাস</th>
                  <th className="border border-gray-300 p-2">বছর</th>
                  <th className="border border-gray-300 p-2 text-center">মাঠে বকেয়া</th>
                  <th className="border border-gray-300 p-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {outstandingMonthlyReports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-center">{months.find(m => m.value === report.month)?.label}</td>
                    <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(report.year)}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{formatCurrency(report.actually_in_field)}</td>
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

        {activeAdminTab === 'office_rents' && (
          <div ref={officeRentsTableRef} className="overflow-x-auto cursor-grab active:cursor-grabbing desktop-scrollbar pb-2">
            <table className="min-w-[1000px] w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-[#FCE4D6]">
                  <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center">ক্রমিক</th>
                  <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center">প্রদানের তারিখ</th>
                  <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center">ভাড়া মাস (মাস-বর্ষ)</th>
                  <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center">টাকার পরিমাণ</th>
                  <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center">ঘর মালিকের নাম</th>
                  <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center">প্রদানকারীর নাম</th>
                  <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center">মন্তব্য</th>
                  <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {sortOfficeRentsByMonth(officeRents).map((rent, idx) => (
                  <tr key={rent.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(idx + 1)}</td>
                    <td className="border border-gray-300 p-2 text-center">{formatDate(rent.payment_date)}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{rent.rent_month}</td>
                    <td className="border border-gray-300 p-2 text-center font-bold">{formatCurrency(rent.amount)}</td>
                    <td className="border border-gray-300 p-2 font-bold">{rent.landlord_name}</td>
                    <td className="border border-gray-300 p-2 font-bold">{rent.payer_name}</td>
                    <td className="border border-gray-300 p-2">{rent.remarks || '---'}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingOfficeRent(rent); setAdminFormType('office_rent'); setFormKey(Date.now()); setShowForm(true); }}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          এডিট
                        </button>
                        <button 
                          onClick={() => handleDeleteOfficeRent(rent.id)}
                          className="text-red-600 hover:text-red-800 font-bold"
                        >
                          মুছুন
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {officeRents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন অফিস ভাড়ার হিসাব পাওয়া যায়নি</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminTab === 'landlords' && (
          <div ref={landlordsTableRef} className="overflow-x-auto cursor-grab active:cursor-grabbing desktop-scrollbar pb-2">
            <table className="min-w-[600px] w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2">নাম</th>
                  <th className="border border-gray-300 p-2">মোবাইল</th>
                  <th className="border border-gray-300 p-2">ঠিকানা</th>
                  <th className="border border-gray-300 p-2">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {landlords.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 font-bold">{l.name}</td>
                    <td className="border border-gray-300 p-2 text-center">{toBengaliNumber(l.mobile)}</td>
                    <td className="border border-gray-300 p-2">{l.address}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => { setEditingLandlord(l); setAdminFormType('landlord'); setFormKey(Date.now()); setShowForm(true); }}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          এডিট
                        </button>
                        <button 
                          onClick={() => handleDeleteLandlord(l.id)}
                          className="text-red-600 hover:text-red-800 font-bold"
                        >
                          মুছুন
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {landlords.length === 0 && (
                  <tr>
                    <td colSpan={4} className="border border-gray-300 p-8 text-center text-gray-400 italic">কোন ঘর মালিকের তথ্য পাওয়া যায়নি</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeAdminTab === 'ripon_bhai' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <button 
                onClick={() => setActiveAdminTab('loans')}
                className="text-gray-500 hover:text-emerald-600 transition-colors"
                title="ফিরে যান"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-gray-800">রিপন ভাই হিসাব</h2>
              <div className="w-6"></div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase">ব্যালেন্স</p>
                <p className="text-3xl font-black text-emerald-600">
                  {formatCurrency(riponTransactions.reduce((acc, t) => t.type === 'receive' ? acc + t.amount : acc - t.amount, 0))}
                </p>
              </div>
              <button 
                onClick={() => setShowRiponForm(true)}
                className="bg-emerald-600 text-white p-2 rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
                title="নতুন লেনদেন"
              >
                <Plus size={24} />
              </button>
            </div>

            <AnimatePresence>
              {showRiponForm && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddRiponTransaction} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 relative space-y-4">
                    <button 
                      type="button"
                      onClick={() => setShowRiponForm(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">টাকা</label>
                        <input required name="amount" type="number" step="any" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">তারিখ</label>
                        <input required name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">ধরণ</label>
                        <select required name="type" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                          <option value="receive">গ্রহণ</option>
                          <option value="payment">পরিশোধ</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">নোট</label>
                        <input name="note" type="text" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
                        যোগ করুন
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-3 text-center">তারিখ</th>
                    <th className="border p-3 text-center">নোট</th>
                    <th className="border p-3 text-center">টাকা</th>
                    <th className="border p-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {riponTransactions.map(transaction => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="border p-3 text-center">{formatDate(transaction.date)}</td>
                      <td className="border p-3 text-left">{transaction.note || '---'}</td>
                      <td className={`border p-3 text-center font-bold ${transaction.type === 'receive' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {transaction.type === 'receive' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </td>
                      <td className="border p-3 text-center">
                        <button 
                          onClick={() => handleDeleteRiponTransaction(transaction.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          মুছুন
                        </button>
                      </td>
                    </tr>
                  ))}
                  {riponTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="border p-8 text-center text-gray-400 italic">কোন লেনদেন পাওয়া যায়নি</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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

        {activeAdminTab === 'risky_loans' && <RiskyLoansManagement riskyLoans={riskyLoans} loans={loans} />}
        {activeAdminTab === 'risky_installments' && <RiskyInstallmentCollection riskyLoans={riskyLoans} />}
      </div>
    </div>
  );


  const renderRiskyLoansManagement = () => {
    return null;
  };
  const _disabled_renderRiskyLoansManagement = () => {
    const [customerName, setCustomerName] = useState('');
    const [accountNo, setAccountNo] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [mobileNo, setMobileNo] = useState('');
    const [address, setAddress] = useState('');
    const [guarantorName, setGuarantorName] = useState('');
    const [amount, setAmount] = useState(0);
    const [totalWithProfit, setTotalWithProfit] = useState(0);
    const [totalPaid, setTotalPaid] = useState(0);
    const [penalty, setPenalty] = useState(0);
    const [savingsDeposit, setSavingsDeposit] = useState(0);
    const [lastPaymentDate, setLastPaymentDate] = useState('');
    const [lastPaymentAmount, setLastPaymentAmount] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<'অনিয়মিত ঋণগ্রহীতা' | 'ঋণ খেলাপি'>('অনিয়মিত ঋণগ্রহীতা');
    
    const [suggestions, setSuggestions] = useState<Loan[]>([]);

    useEffect(() => {
      // disabled
    }, []);
    const editingRiskyLoan: any = null;
    const showRiskyLoanForm: any = false;
    const setShowRiskyLoanForm: any = () => {};
    const setEditingRiskyLoan: any = () => {};

    if (false) {
      if (editingRiskyLoan) {
        setCustomerName(editingRiskyLoan.customer_name || '');
        setAccountNo(editingRiskyLoan.account_no || '');
        setFatherName(editingRiskyLoan.father_name || '');
        setMobileNo(editingRiskyLoan.mobile_no || '');
        setAddress(editingRiskyLoan.address || '');
        setGuarantorName(editingRiskyLoan.guarantor_name || '');
        setAmount(editingRiskyLoan.amount || 0);
        setTotalWithProfit(editingRiskyLoan.total_with_profit || 0);
        setTotalPaid(editingRiskyLoan.total_paid || 0);
        setPenalty(editingRiskyLoan.penalty || 0);
        setSavingsDeposit(editingRiskyLoan.savings_deposit || 0);
        setLastPaymentDate(editingRiskyLoan.last_payment_date || '');
        setLastPaymentAmount(editingRiskyLoan.last_payment_amount || 0);
        setStartDate(editingRiskyLoan.start_date || '');
        setEndDate(editingRiskyLoan.end_date || '');
        setStatus(editingRiskyLoan.status as any || 'অনিয়মিত ঋণগ্রহীতা');
      } else {
        setCustomerName('');
        setAccountNo('');
        setFatherName('');
        setMobileNo('');
        setAddress('');
        setGuarantorName('');
        setAmount(0);
        setTotalWithProfit(0);
        setTotalPaid(0);
        setPenalty(0);
        setSavingsDeposit(0);
        setLastPaymentDate('');
        setLastPaymentAmount(0);
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setStatus('অনিয়মিত ঋণগ্রহীতা');
      }
    }

    const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomerName(val);
      if (val.trim().length >= 1) {
        const matches = loans.filter(l => l.customer_name.toLowerCase().includes(val.toLowerCase()));
        setSuggestions(matches.slice(0, 10));
      } else {
        setSuggestions([]);
      }
    };

    const handleSelectSuggestion = (loan: Loan) => {
      setCustomerName(loan.customer_name);
      setAccountNo(loan.account_no);
      setMobileNo(loan.mobile_no || '');
      setGuarantorName(loan.guarantor_name || '');
      setAmount(loan.amount || 0);
      setTotalWithProfit(loan.total_with_profit || 0);
      setSuggestions([]);
    };

    const handleRiskyLoanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      const totalDue = totalWithProfit - totalPaid;
      const totalDueWithPenalty = totalDue + penalty;

      const dataToSave = {
        customer_name: customerName,
        account_no: accountNo,
        father_name: fatherName,
        mobile_no: mobileNo,
        address: address,
        guarantor_name: guarantorName,
        amount,
        total_with_profit: totalWithProfit,
        total_paid: totalPaid,
        total_due: totalDue,
        penalty: penalty,
        total_due_with_penalty: totalDueWithPenalty,
        savings_deposit: savingsDeposit,
        last_payment_date: lastPaymentDate,
        last_payment_amount: lastPaymentAmount,
        start_date: startDate,
        end_date: endDate,
        status,
        updated_at: serverTimestamp(),
        created_at: editingRiskyLoan ? editingRiskyLoan.created_at : serverTimestamp()
      };

      try {
        if (editingRiskyLoan) {
          await updateDoc(doc(db, 'risky_loans', editingRiskyLoan.id), dataToSave);
          alert('ঋণ হিসাব সফলভাবে আপডেট করা হয়েছে');
        } else {
          await addDoc(collection(db, 'risky_loans'), dataToSave);
          alert('ঋণ হিসাব সফলভাবে যোগ করা হয়েছে');
        }
        setShowRiskyLoanForm(false);
        setEditingRiskyLoan(null);
      } catch (err: any) {
        console.error("Error saving risky loan:", err);
        alert('সংরক্ষণ করতে ত্রুটি: ' + err.message);
      }
    };

    const handleToDelete = async (id: string) => {
      if (!confirm('আপনি কি নিশ্চিত যে এই ঝুঁকিপূর্ণ ঋণটি তালিকা থেকে মুছে ফেলতে চান?')) return;
      try {
        await deleteDoc(doc(db, 'risky_loans', id));
        alert('সফলভাবে মুছে ফেলা হয়েছে');
      } catch (err: any) {
        alert('মুছতে সমস্যা হয়েছে: ' + err.message);
      }
    };

    if (showRiskyLoanForm) {
      return (
        <div className="space-y-6 font-sans">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-xl font-bold text-gray-800">
              {editingRiskyLoan ? 'ঝুঁকিপূর্ণ ঋণ সংশোধন করুন' : 'নতুন ঝুঁকিপূর্ণ ঋণ যোগ করুন'}
            </h3>
            <button 
              onClick={() => { setShowRiskyLoanForm(false); setEditingRiskyLoan(null); }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all"
            >
              তালিকায় ফিরে যান
            </button>
          </div>

          <form onSubmit={handleRiskyLoanSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-1">গ্রাহকের নাম *</label>
                <input 
                  type="text"
                  required
                  value={customerName}
                  onChange={handleCustomerNameChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="গ্রাহকের নাম লিখুন..."
                />
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-[200]">
                    {suggestions.map(s => (
                      <div 
                        key={s.id}
                        onClick={() => handleSelectSuggestion(s)}
                        className="px-4 py-2 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 text-sm font-medium text-gray-700"
                      >
                        {s.customer_name} (হিসাব: {s.account_no})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">হিসাব নাম্বার *</label>
                <input 
                  type="text"
                  required
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">বাবার নাম</label>
                <input 
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">মোবাইল নাম্বার</label>
                <input 
                  type="tel"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-bold text-gray-700 mb-1">ঠিকানা</label>
                <input 
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">জামিনদারের নাম</label>
                <input 
                  type="text"
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <CurrencyInput name="amount" value={amount} onChange={(val) => setAmount(parseFloat(val) || 0)} label="বিনিয়োগের পরিমাণ *" required />
              <CurrencyInput name="total_with_profit" value={totalWithProfit} onChange={(val) => setTotalWithProfit(parseFloat(val) || 0)} label="মুনাফাসহ মোট *" required />
              <CurrencyInput name="total_paid" value={totalPaid} onChange={(val) => setTotalPaid(parseFloat(val) || 0)} label="মোট পরিশোধ *" required />
              
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-1">মোট বকেয়া (স্বয়ংক্রিয় হিসাব)</label>
                <div className="w-full px-4 py-2 rounded-lg border bg-gray-50 text-gray-600 font-bold">
                  {formatCurrency(totalWithProfit - totalPaid)}
                </div>
              </div>

              <CurrencyInput name="penalty" value={penalty} onChange={(val) => setPenalty(parseFloat(val) || 0)} label="ঋণ খেলাপি জরিমানা" />
              
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-1">খেলাপি জরিমানাসহ বকেয়া (স্বয়ংক্রিয় হিসাব)</label>
                <div className="w-full px-4 py-2 rounded-lg border bg-gray-50 text-red-600 font-bold">
                  {formatCurrency((totalWithProfit - totalPaid) + penalty)}
                </div>
              </div>

              <CurrencyInput name="savings_deposit" value={savingsDeposit} onChange={(val) => setSavingsDeposit(parseFloat(val) || 0)} label="সাধারণ সঞ্চয় জমা" />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">সর্বশেষ কিস্তি পরিশোধের তারিখ</label>
                <input 
                  type="date"
                  value={lastPaymentDate}
                  onChange={(e) => setLastPaymentDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <CurrencyInput name="last_payment_amount" value={lastPaymentAmount} onChange={(val) => setLastPaymentAmount(parseFloat(val) || 0)} label="সর্বশেষ প্রদান কৃত টাকার পরিমান" />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">বিনিয়োগের সময় শুরু *</label>
                <input 
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">বিনিয়োগের সময় শেষ *</label>
                <input 
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">স্ট্যাটাস *</label>
                <select 
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="অনিয়মিত ঋণগ্রহীতা">অনিয়মিত ঋণগ্রহীতা</option>
                  <option value="ঋণ খেলাপি">ঋণ খেলাপি</option>
                </select>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                type="button" 
                onClick={() => { setShowRiskyLoanForm(false); setEditingRiskyLoan(null); }}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold transition-all"
              >
                বাতিল
              </button>
              <button 
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md shadow-emerald-50"
              >
                {editingRiskyLoan ? 'হিসাব আপডেট করুন' : 'হিসাব সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">ঝুঁকিপূর্ণ ঋণ তালিকা</h3>
          <button 
            onClick={() => { setEditingRiskyLoan(null); setShowRiskyLoanForm(true); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-all shadow-sm"
          >
            <Plus size={16} /> ঝুঁকিপূর্ণ ঋণ যোগ করুন
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-gray-50 text-blue-900">
                <th className="border p-2 text-center whitespace-nowrap">ক্রমিক</th>
                <th className="border p-2 text-left whitespace-nowrap">গ্রাহকের নাম</th>
                <th className="border p-2 text-center whitespace-nowrap">হিসাব নং</th>
                <th className="border p-2 text-center whitespace-nowrap">বিনিয়োগের পরিমাণ</th>
                <th className="border p-2 text-center whitespace-nowrap">মুনাফাসহ মোট</th>
                <th className="border p-2 text-center whitespace-nowrap">মোট পরিশোধ</th>
                <th className="border p-2 text-center whitespace-nowrap">মোট বকেয়া</th>
                <th className="border p-2 text-center whitespace-nowrap">স্ট্যাটাস</th>
                <th className="border p-2 text-center whitespace-nowrap">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {riskyLoans.map((l, idx) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-center whitespace-nowrap">{toBengaliNumber(idx + 1)}</td>
                  <td className="border p-2 text-left font-bold whitespace-nowrap">{l.customer_name}</td>
                  <td className="border p-2 text-center whitespace-nowrap">{toBengaliNumber(l.account_no)}</td>
                  <td className="border p-2 text-center whitespace-nowrap">{formatCurrency(l.amount)}</td>
                  <td className="border p-2 text-center whitespace-nowrap">{formatCurrency(l.total_with_profit)}</td>
                  <td className="border p-2 text-center whitespace-nowrap text-emerald-700 font-semibold">{formatCurrency(l.total_paid)}</td>
                  <td className="border p-2 text-center whitespace-nowrap text-red-600 font-semibold">{formatCurrency(l.total_due)}</td>
                  <td className="border p-2 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      l.status === 'অনিয়মিত ঋণগ্রহীতা' ? 'bg-amber-100 text-amber-700' : 
                      l.status === 'পরিশোধিত' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="border p-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => { setEditingRiskyLoan(l); setShowRiskyLoanForm(true); }}
                        className="text-blue-600 hover:text-blue-800 font-bold"
                      >
                        এডিট
                      </button>
                      <button 
                        onClick={() => handleToDelete(l.id)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        মুছুন
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {riskyLoans.length === 0 && (
                <tr>
                  <td colSpan={9} className="border p-8 text-center text-gray-400 italic">কোন ঝুঁকিপূর্ণ ঋণ হিসাব পাওয়া যায়নি</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRiskyInstallmentCollection = () => {
    return null;
  };
  const _disabled_renderRiskyInstallmentCollection = () => {
    const [accountNo, setAccountNo] = useState('');
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');

    const [selectedLoan, setSelectedLoan] = useState<RiskyLoan | null>(null);
    const [accountSuggestions, setAccountSuggestions] = useState<RiskyLoan[]>([]);

    if (false) {
    const handleAccountNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setAccountNo(val);
      setSelectedLoan(null);
      if (val.trim().length >= 1) {
        const matches = riskyLoans.filter(l => 
          (l.account_no.toLowerCase().includes(val.toLowerCase()) || 
           l.customer_name.toLowerCase().includes(val.toLowerCase())) &&
          l.total_due > 0 && l.status !== 'পরিশোধিত'
        );
        setAccountSuggestions(matches.slice(0, 10));
      } else {
        setAccountSuggestions([]);
      }
    };

    const handleSelectAccount = (loan: RiskyLoan) => {
      setAccountNo(loan.account_no);
      setSelectedLoan(loan);
      setAccountSuggestions([]);
    };

    const handleCollectionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      if (!selectedLoan) {
        alert('দয়া করে একটি সঠিক ঝুঁকিপূর্ণ হিসাব নির্বাচন করুন');
        return;
      }

      if (amount <= 0) {
        alert('দয়া করে সঠিক আদায়ের পরিমাণ লিখুন');
        return;
      }

      const newTotalPaid = selectedLoan.total_paid + amount;
      const newTotalDue = Math.max(0, selectedLoan.total_due - amount);
      const newTotalDueWithPenalty = Math.max(0, selectedLoan.total_due_with_penalty - amount);
      const newStatus = newTotalDue <= 0 ? 'পরিশোধিত' : selectedLoan.status;

      try {
        await updateDoc(doc(db, 'risky_loans', selectedLoan.id), {
          total_paid: newTotalPaid,
          total_due: newTotalDue,
          total_due_with_penalty: newTotalDueWithPenalty,
          status: newStatus,
          last_payment_date: date,
          last_payment_amount: amount,
          updated_at: serverTimestamp()
        });

        await addDoc(collection(db, 'risky_installments'), {
          account_no: selectedLoan.account_no,
          customer_name: selectedLoan.customer_name,
          amount,
          date,
          note,
          created_at: serverTimestamp()
        });

        alert('কিস্তি সফলভাবে আদায় করা হয়েছে এবং হিসাব আপডেট করা হয়েছে!');
        
        setAccountNo('');
        setAmount(0);
        setNote('');
        setSelectedLoan(null);
        setFormKey(Date.now());
      } catch (err: any) {
        console.error("Error collecting risky loan installment:", err);
        alert('সংগ্রহ করতে সমস্যা হয়েছে: ' + err.message);
      }
    };

    return (
      <div className="space-y-6 font-sans">
        <h3 className="text-lg font-bold text-gray-800 border-b pb-2">কিস্তি আদায় ফর্ম (ঝুঁকিপূর্ণ বিনিয়োগ)</h3>
        
        <form key={formKey} onSubmit={handleCollectionSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-700 mb-1">হিসাব নাম্বার অথবা নাম লিখুন *</label>
                <input 
                  type="text"
                  required
                  value={accountNo}
                  onChange={handleAccountNoChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="খুঁজুন..."
                />
                {accountSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-[200]">
                    {accountSuggestions.map(s => (
                      <div 
                        key={s.id}
                        onClick={() => handleSelectAccount(s)}
                        className="px-4 py-2 hover:bg-emerald-50 cursor-pointer border-b last:border-b-0 text-sm font-medium text-gray-700"
                      >
                        {s.customer_name} (হিসাব: {s.account_no})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <CurrencyInput name="amount" value={amount} onChange={(val) => setAmount(parseFloat(val) || 0)} label="আদায়ের পরিমাণ *" required />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">তারিখ *</label>
                <input 
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">মন্তব্য (নোট)</label>
                <input 
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="কোন তথ্য থাকলে লিখুন..."
                />
              </div>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl space-y-4">
              <h4 className="font-bold text-emerald-800 border-b border-emerald-100 pb-2 flex items-center gap-2">
                <User size={18} /> গ্রাহকের বিবরণী
              </h4>
              
              {selectedLoan ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">গ্রাহকের নাম:</span>
                    <span className="font-bold text-gray-800">{selectedLoan.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">হিসাব নং:</span>
                    <span className="font-bold text-gray-800">{toBengaliNumber(selectedLoan.account_no)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">মোট বিনিয়োগ (মুনাফাসহ):</span>
                    <span className="font-bold text-indigo-700">{formatCurrency(selectedLoan.total_with_profit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">মোট পরিশোধিত:</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(selectedLoan.total_paid)}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-100/50 pt-2">
                    <span className="text-red-600 font-medium">মোট বকেয়া:</span>
                    <span className="font-bold text-red-600">{formatCurrency(selectedLoan.total_due)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700 font-medium">খেলাপি জরিমানাসহ মোট বকেয়া:</span>
                    <span className="font-bold text-red-700">{formatCurrency(selectedLoan.total_due_with_penalty)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">স্ট্যাটাস:</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold">{selectedLoan.status}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 italic">
                  দয়া করে উপরে হিসাব নাম্বার লিখে বা নাম লিখে সঠিক ঝুঁকিপূর্ণ গ্রাহক সিলেক্ট করুন
                </div>
              )}
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="submit"
              disabled={!selectedLoan}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md ${
                selectedLoan 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-50' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              কিস্তি আদায় করুন
            </button>
          </div>
        </form>
      </div>
    );
    }
  };


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
        <button type="button" onClick={closeFormModal} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
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
        <button type="button" onClick={closeFormModal} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
        <button type="submit" className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm">{editingSaving ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-gray-900 pl-safe pr-safe pb-safe">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-transparent z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-gray-100 flex-col p-6 sticky top-0 h-screen pt-safe">
        <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => navigateTo('home')}>
          <div className={`${settings.logo_url ? '' : 'bg-emerald-600 p-2 shadow-md'} rounded-xl text-white overflow-hidden w-10 h-10 flex items-center justify-center`}>
            {settings.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <LayoutDashboard size={24} />
            )}
          </div>
          <span className="font-bold text-xl text-emerald-800 leading-tight">ইনসাফ সমবায় সমিতি</span>
        </div>
        
        <nav className="flex-1 space-y-2 font-bangla overflow-y-auto pr-1">
          <NavItem active={currentView === 'home'} icon={LayoutDashboard} label="হোম পেজ" view="home" />
          <NavItem active={currentView === 'loans'} icon={HandCoins} label="বিনিয়োগ (লোন) প্রদান" view="loans" />
          <NavItem active={currentView === 'general_savings'} icon={PiggyBank} label="সাধারণ সঞ্চয় প্রদান" view="general_savings" />
          <NavItem active={currentView === 'monthly_savings'} icon={CalendarClock} label="মাসিক সঞ্চয় (ডিপিএস) প্রদান" view="monthly_savings" />
          <NavItem active={currentView === 'reports'} icon={Search} label="মাসিক রিপোর্ট" view="reports" />
          <NavItem active={currentView === 'outstanding_list'} icon={HandCoins} label="বকেয়া মাঠে আছে" view="outstanding_list" />
          <NavItem active={currentView === 'outstanding_monthly_report'} icon={FileText} label="বকেয়া মাসিক প্রতিবেদন" view="outstanding_monthly_report" />
          <NavItem active={currentView === 'office_rents'} icon={FileText} label="অফিস ভাড়া" view="office_rents" />
          <NavItem active={currentView === 'landlord_list'} icon={User} label="ঘর মালিকের লিস্ট" view="landlord_list" />
          <NavItem active={currentView === 'office_rent_report'} icon={FileText} label="অফিস ভাড়ার রিপোর্ট" view="office_rent_report" />
          <NavItem active={currentView === 'risky_investments'} icon={AlertTriangle} label="ঝুঁকিপূর্ণ বিনিয়োগ" view="risky_investments" />
          <NavItem active={currentView === 'admin' || currentView === 'login'} icon={Filter} label="এডমিন প্যানেল" view={isLoggedIn ? 'admin' : 'login'} />
        </nav>

        <div className="mt-auto bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider mb-2">সহযোগিতার জন্য</p>
          <p className="text-sm font-medium flex items-center gap-2 text-emerald-800">
            <Phone size={14} /> ০১৩০০-৫৯৪৫২২
          </p>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-50 pt-safe">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('home')}>
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
            className="md:hidden fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] bg-white z-40 p-6 flex flex-col gap-4 pt-4 pb-safe overflow-y-auto"
          >
            <NavItem active={currentView === 'home'} icon={LayoutDashboard} label="হোম পেজ" view="home" />
            <NavItem active={currentView === 'loans'} icon={HandCoins} label="বিনিয়োগ (লোন) প্রদান" view="loans" />
            <NavItem active={currentView === 'general_savings'} icon={PiggyBank} label="সাধারণ সঞ্চয় প্রদান" view="general_savings" />
            <NavItem active={currentView === 'monthly_savings'} icon={CalendarClock} label="মাসিক সঞ্চয় (ডিপিএস) প্রদান" view="monthly_savings" />
            <NavItem active={currentView === 'reports'} icon={Search} label="মাসিক রিপোর্ট" view="reports" />
            <NavItem active={currentView === 'outstanding_list'} icon={HandCoins} label="বকেয়া মাঠে আছে" view="outstanding_list" />
            <NavItem active={currentView === 'outstanding_monthly_report'} icon={FileText} label="বকেয়া মাসিক প্রতিবেদন" view="outstanding_monthly_report" />
            <NavItem active={currentView === 'office_rents'} icon={FileText} label="অফিস ভাড়া" view="office_rents" />
            <NavItem active={currentView === 'landlord_list'} icon={User} label="ঘর মালিকের লিস্ট" view="landlord_list" />
            <NavItem active={currentView === 'office_rent_report'} icon={FileText} label="অফিস ভাড়ার রিপোর্ট" view="office_rent_report" />
            <NavItem active={currentView === 'risky_investments'} icon={AlertTriangle} label="ঝুঁকিপূর্ণ বিনিয়োগ" view="risky_investments" />
            <NavItem active={currentView === 'admin' || currentView === 'login'} icon={Filter} label="এডমিন প্যানেল" view={isLoggedIn ? 'admin' : 'login'} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 w-full pt-safe ${
        ['office_rents', 'office_rent_report', 'risky_investments'].includes(currentView)
          ? 'p-2 max-w-full'
          : 'p-4 md:p-10 max-w-7xl mx-auto'
      }`}>
        
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
            {currentView === 'office_rents' && <OfficeRentsView officeRents={officeRents} landlords={landlords} societyInfo={societyInfo} />}
            {currentView === 'landlord_list' && <LandlordListView landlords={landlords} societyInfo={societyInfo} />}
            {currentView === 'office_rent_report' && <OfficeRentReportView officeRents={officeRents} landlords={landlords} societyInfo={societyInfo} />}
            {currentView === 'risky_investments' && <RiskyInvestmentsView riskyLoans={riskyLoans} riskyInstallments={riskyInstallments} societyInfo={societyInfo} />}
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
                  adminFormType === 'outstanding_monthly' ? 'bg-emerald-700' : 
                  adminFormType === 'office_rent' ? 'bg-indigo-600' : 
                  adminFormType === 'landlord' ? 'bg-teal-600' : 'bg-gray-600'
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
                    adminFormType === 'outstanding_monthly' ? 'বকেয়া মাসিক প্রতিবেদন ফর্ম' : 
                    adminFormType === 'office_rent' ? (editingOfficeRent ? 'অফিস ভাড়া এডিট ফর্ম' : 'নতুন অফিস ভাড়া ফর্ম') : 
                    adminFormType === 'landlord' ? (editingLandlord ? 'ঘর মালিক এডিট ফর্ম' : 'নতুন ঘর মালিক ফর্ম') : 'বকেয়া স্থিতি ফর্ম'
                  ) : (
                    currentView === 'loans' ? 'নতুন বিনিয়োগ ফর্ম' : 
                    currentView === 'general_savings' ? 'সাধারণ সঞ্চয় ফর্ম' : 'মাসিক সঞ্চয় (ডিপিএস) ফর্ম'
                  )}
                </h3>
                <button onClick={closeFormModal} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
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
                      onCancel={closeFormModal} 
                      formKey={formKey}
                    />
                  ) : adminFormType === 'outstanding_monthly' ? (
                    <OutstandingMonthlyReportForm 
                      editingReport={editingOutstandingMonthlyReport}
                      onSave={handleSaveOutstandingMonthlyReport}
                      onCancel={closeFormModal}
                      formKey={formKey}
                      outstandingBalances={outstandingBalances}
                      loans={loans}
                      reports={reports}
                    />
                  ) : adminFormType === 'office_rent' ? (
                    <OfficeRentForm 
                      editingOfficeRent={editingOfficeRent}
                      landlords={landlords}
                      years={years}
                      formKey={formKey}
                      onCancel={closeFormModal}
                      onSave={handleSaveOfficeRent}
                      setAdminFormType={setAdminFormType}
                      setFormKey={setFormKey}
                    />
                  ) : adminFormType === 'landlord' ? (
                    <LandlordForm 
                      onSubmit={handleSaveLandlord}
                      editingLandlord={editingLandlord}
                      onCancel={closeFormModal}
                      formKey={formKey}
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

// ================= Standalone Components for Office Rent and Landlord =================

interface OfficeRentsViewProps {
  officeRents: OfficeRent[];
  landlords: Landlord[];
  societyInfo: any;
}

const OfficeRentsView = ({ officeRents, landlords, societyInfo }: OfficeRentsViewProps) => {
  const [selectedLandlord, setSelectedLandlord] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDetailRent, setSelectedDetailRent] = useState<OfficeRent | null>(null);

  const filteredRents = selectedLandlord === '' 
    ? officeRents 
    : officeRents.filter(r => {
        const landlord = landlords.find(l => l.id === selectedLandlord);
        return r.landlord_id === selectedLandlord || (landlord && !r.landlord_id && r.landlord_name === landlord.name);
      });

  const sortedRents = sortOfficeRentsByMonth(filteredRents);

  const itemsPerPage = 30;
  const totalPages = Math.ceil(sortedRents.length / itemsPerPage);
  const displayedRents = sortedRents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLandlord]);

  useEffect(() => {
    const handlePopState = () => {
      setSelectedDetailRent(null);
    };

    if (selectedDetailRent) {
      window.history.pushState({ modalOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedDetailRent]);

  const closeDetailRent = () => {
    if (window.history.state?.modalOpen) {
      window.history.back();
    } else {
      setSelectedDetailRent(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-1">
          <FileText size={18} className="text-emerald-600" />
          অফিস ভাড়া
        </h2>

        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-300">
          <label className="text-xs font-bold text-gray-600 whitespace-nowrap">ঘর মালিক:</label>
          <select 
            value={selectedLandlord}
            onChange={(e) => setSelectedLandlord(e.target.value)}
            className="text-xs outline-none bg-transparent font-bold text-gray-700 cursor-pointer"
          >
            <option value="">সকল ঘর মালিক</option>
            {landlords.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse border border-gray-400 text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FCE4D6]">
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center whitespace-nowrap">ক্রমিক</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center whitespace-nowrap">প্রদানের তারিখ</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center whitespace-nowrap">ভাড়া মাস (মাস-বর্ষ)</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center whitespace-nowrap">টাকার পরিমাণ</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-left whitespace-nowrap">ঘর মালিকের নাম</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-left whitespace-nowrap">প্রদানকারীর নাম</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-left whitespace-nowrap">গ্রহণকারীর নাম</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-left whitespace-nowrap">মন্তব্য</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center whitespace-nowrap">একশন</th>
              </tr>
            </thead>
            <tbody>
              {displayedRents.map((rent, idx) => (
                <tr key={rent.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{toBengaliNumber((currentPage - 1) * itemsPerPage + idx + 1)}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{formatDate(rent.payment_date)}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap text-emerald-700">{rent.rent_month}</td>
                  <td className="border border-gray-300 p-2 text-center font-black whitespace-nowrap text-emerald-600">{formatCurrency(rent.amount)}</td>
                  <td className="border border-gray-300 p-2 font-bold text-left whitespace-nowrap">{rent.landlord_name}</td>
                  <td className="border border-gray-300 p-2 font-bold text-left whitespace-nowrap">{rent.payer_name}</td>
                  <td className="border border-gray-300 p-2 font-bold text-left whitespace-nowrap">{rent.receiver_name || '---'}</td>
                  <td className="border border-gray-300 p-2 text-left whitespace-nowrap">{rent.remarks || '---'}</td>
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">
                    <button 
                      onClick={() => setSelectedDetailRent(rent)} 
                      className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-full transition-all inline-flex items-center justify-center"
                      title="বিস্তারিত দেখুন"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {displayedRents.length === 0 && (
                <tr>
                  <td colSpan={9} className="border border-gray-300 p-8 text-center text-gray-400 italic font-bold whitespace-nowrap">
                    কোন তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-6 border-t border-gray-100 pt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  currentPage === page 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-50' 
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {toBengaliNumber(page)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedDetailRent && (() => {
        const breakdown = getRentBreakdown(selectedDetailRent);
        return (
          <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col font-sans pb-safe">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 shadow-sm pt-safe pl-safe pr-safe">
              <div className="w-full flex items-center">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={closeDetailRent}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 hover:text-gray-800"
                    title="ফিরে যান"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">অফিস ভাড়া বিবরণী</span>
                    <h1 className="text-sm sm:text-lg font-black text-gray-900 leading-tight">পরিশোধের বিস্তারিত তথ্য</h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white">
              <div className="w-full px-2 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Rent Details Table */}
                  <div className="lg:col-span-5">
                    <div className="overflow-x-auto w-full border border-gray-400 rounded-lg shadow-sm">
                      <table className="w-full border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-[#FCE4D6]">
                            <th colSpan={2} className="border-b border-gray-400 p-2.5 text-blue-800 font-bold text-center whitespace-nowrap">ভাড়া প্রদান বিবরণী</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-300">
                            <td className="border-r border-gray-400 p-2.5 bg-gray-50 text-gray-600 font-bold whitespace-nowrap w-1/3">ঘর মালিকের নাম</td>
                            <td className="p-2.5 font-bold text-gray-800 whitespace-nowrap">{selectedDetailRent.landlord_name}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="border-r border-gray-400 p-2.5 bg-gray-50 text-gray-600 font-bold whitespace-nowrap">প্রদানের তারিখ</td>
                            <td className="p-2.5 font-bold text-gray-800 whitespace-nowrap">{formatDate(selectedDetailRent.payment_date)}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="border-r border-gray-400 p-2.5 bg-gray-50 text-gray-600 font-bold whitespace-nowrap">ভাড়া মাস (মাস-বর্ষ)</td>
                            <td className="p-2.5 font-bold text-emerald-700 whitespace-nowrap">{selectedDetailRent.rent_month}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="border-r border-gray-400 p-2.5 bg-gray-50 text-gray-600 font-bold whitespace-nowrap">মোট পরিশোধিত টাকা</td>
                            <td className="p-2.5 font-black text-emerald-600 whitespace-nowrap">{formatCurrency(selectedDetailRent.amount)}</td>
                          </tr>
                          <tr className="border-b border-gray-300">
                            <td className="border-r border-gray-400 p-2.5 bg-gray-50 text-gray-600 font-bold whitespace-nowrap">প্রদানকারী</td>
                            <td className="p-2.5 font-bold text-gray-800 whitespace-nowrap">{selectedDetailRent.payer_name}</td>
                          </tr>
                          <tr className={selectedDetailRent.remarks ? "border-b border-gray-300" : ""}>
                            <td className="border-r border-gray-400 p-2.5 bg-gray-50 text-gray-600 font-bold whitespace-nowrap">গ্রহণকারী</td>
                            <td className="p-2.5 font-bold text-gray-800 whitespace-nowrap">{selectedDetailRent.receiver_name || '---'}</td>
                          </tr>
                          {selectedDetailRent.remarks && (
                            <tr>
                              <td className="border-r border-gray-400 p-2.5 bg-gray-50 text-gray-600 font-bold whitespace-nowrap">মন্তব্য</td>
                              <td className="p-2.5 font-bold text-gray-800 leading-relaxed whitespace-nowrap">{selectedDetailRent.remarks}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Breakdown Table */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between pb-1 px-1">
                      <h3 className="text-sm sm:text-base font-bold text-gray-700">মাসিক বিভাজন (Breakdown)</h3>
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black">
                        মোট {toBengaliNumber(breakdown.length)} মাস
                      </span>
                    </div>

                    <div className="overflow-x-auto w-full">
                      <table className="w-full border-collapse border border-gray-400 text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-[#FCE4D6]">
                            <th className="border border-gray-400 p-2.5 text-blue-800 font-bold text-center whitespace-nowrap w-16">ক্রমিক</th>
                            <th className="border border-gray-400 p-2.5 text-blue-800 font-bold text-center whitespace-nowrap">মাসের নাম (বছর সহ)</th>
                            <th className="border border-gray-400 p-2.5 text-blue-800 font-bold text-center whitespace-nowrap">টাকার পরিমাণ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-2.5 text-center font-bold text-gray-800 whitespace-nowrap">{toBengaliNumber(item.serial)}</td>
                              <td className="border border-gray-300 p-2.5 text-center font-bold text-gray-800 whitespace-nowrap">{item.month}</td>
                              <td className="border border-gray-300 p-2.5 text-center font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-emerald-50">
                            <td colSpan={2} className="border border-gray-300 p-2.5 text-right text-gray-700 font-extrabold whitespace-nowrap">সর্বমোট পরিশোধ:</td>
                            <td className="border border-gray-300 p-2.5 text-center text-emerald-700 font-black whitespace-nowrap">{formatCurrency(selectedDetailRent.amount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

interface OfficeRentFormProps {
  editingOfficeRent: OfficeRent | null;
  landlords: Landlord[];
  years: string[];
  formKey: number;
  onCancel: () => void;
  onSave: (data: {
    payTogether: boolean;
    landlordId: string;
    landlordName: string;
    amount: number;
    payment_date: string;
    payer_name: string;
    receiver_name: string;
    remarks: string;
    rent_month?: string;
    startMonth?: string;
    startYear?: number;
    endMonth?: string;
    endYear?: number;
  }) => void;
  setAdminFormType: (type: any) => void;
  setFormKey: (key: number) => void;
}

const OfficeRentForm = ({
  editingOfficeRent,
  landlords,
  years,
  formKey,
  onCancel,
  onSave,
  setAdminFormType,
  setFormKey,
}: OfficeRentFormProps) => {
  const [payTogether, setPayTogether] = useState(false);
  const [selectedLandlordId, setSelectedLandlordId] = useState(editingOfficeRent?.landlord_id || '');
  
  const [singleMonth, setSingleMonth] = useState('জানুয়ারি');
  const [singleYear, setSingleYear] = useState(new Date().getFullYear().toString());

  const [startMonth, setStartMonth] = useState('জানুয়ারি');
  const [startYear, setStartYear] = useState(new Date().getFullYear().toString());
  const [endMonth, setEndMonth] = useState('জানুয়ারি');
  const [endYear, setEndYear] = useState(new Date().getFullYear().toString());

  const bengaliMonthsOnly = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  useEffect(() => {
    if (editingOfficeRent) {
      const isRange = editingOfficeRent.rent_month.includes(' হতে ');
      if (isRange) {
        setPayTogether(true);
        const parts = editingOfficeRent.rent_month.split(' হতে ');
        if (parts.length === 2) {
          const startParts = parts[0].split('-');
          const endParts = parts[1].split('-');
          if (startParts.length === 2) {
            setStartMonth(startParts[0]);
            setStartYear(toEnglishNumber(startParts[1]));
          }
          if (endParts.length === 2) {
            setEndMonth(endParts[0]);
            setEndYear(toEnglishNumber(endParts[1]));
          }
        }
      } else {
        setPayTogether(false);
        const parts = editingOfficeRent.rent_month.split('-');
        if (parts.length === 2) {
          setSingleMonth(parts[0]);
          const engYear = toEnglishNumber(parts[1]);
          setSingleYear(engYear);
        }
      }
    }
  }, [editingOfficeRent]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const landlordId = formData.get('landlord_id') as string;
    const landlord = landlords.find(l => l.id === landlordId);
    if (!landlord) {
      alert('দয়া করে সঠিক ঘর মালিক সিলেক্ট করুন');
      return;
    }

    const amount = parseFloat((formData.get('amount') as string).replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      alert('দয়া করে সঠিক টাকার পরিমাণ লিখুন');
      return;
    }

    const payment_date = formData.get('payment_date') as string;
    const payer_name = formData.get('payer_name') as string;
    const receiver_name = formData.get('receiver_name') as string;
    const remarks = (formData.get('remarks') as string) || '';

    onSave({
      payTogether,
      landlordId,
      landlordName: landlord.name,
      amount,
      payment_date,
      payer_name,
      receiver_name,
      remarks,
      rent_month: `${singleMonth}-${toBengaliNumber(singleYear)}`,
      startMonth,
      startYear: parseInt(startYear),
      endMonth,
      endYear: parseInt(endYear)
    });
  };

  if (landlords.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-red-500 font-bold mb-4">দয়া করে প্রথমে 'এড ঘর মালিক' অপশন থেকে ঘর মালিক যোগ করুন।</p>
        <button 
          type="button" 
          onClick={() => { setAdminFormType('landlord'); setFormKey(Date.now()); }}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm"
        >
          ঘর মালিক যোগ করুন
        </button>
      </div>
    );
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <input 
          type="checkbox" 
          id="pay_together_checkbox" 
          checked={payTogether}
          onChange={(e) => setPayTogether(e.target.checked)}
          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
        />
        <label htmlFor="pay_together_checkbox" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
          একসাথে প্রদান করুন
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ঘর মালিক</label>
          <select 
            required 
            name="landlord_id" 
            value={selectedLandlordId}
            onChange={(e) => setSelectedLandlordId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">ঘর মালিক নির্বাচন করুন</option>
            {landlords.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.mobile})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">প্রদানের তারিখ</label>
          <input 
            required 
            name="payment_date" 
            type="date" 
            defaultValue={editingOfficeRent?.payment_date || new Date().toISOString().split('T')[0]} 
            className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" 
          />
        </div>

        {!payTogether ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ভাড়া মাস</label>
                <select 
                  value={singleMonth} 
                  onChange={(e) => setSingleMonth(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {bengaliMonthsOnly.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">বছর</label>
                <input 
                  type="text"
                  required
                  value={singleYear} 
                  onChange={(e) => setSingleYear(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <CurrencyInput required name="amount" defaultValue={editingOfficeRent?.amount} label="টাকার পরিমান" />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ভাড়া মাস শুরু</label>
                <select 
                  value={startMonth} 
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {bengaliMonthsOnly.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">বছর</label>
                <input 
                  type="text"
                  required
                  value={startYear} 
                  onChange={(e) => setStartYear(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ভাড়া মাস শেষ</label>
                <select 
                  value={endMonth} 
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {bengaliMonthsOnly.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">বছর</label>
                <input 
                  type="text"
                  required
                  value={endYear} 
                  onChange={(e) => setEndYear(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <CurrencyInput required name="amount" defaultValue={editingOfficeRent?.amount} label="টাকার পরিমান" />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ইনপুট প্রদান কারীর নাম</label>
          <input required name="payer_name" defaultValue={editingOfficeRent?.payer_name} type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ইনপুট গ্রহণকারীর নাম</label>
          <input required name="receiver_name" defaultValue={editingOfficeRent?.receiver_name || ''} type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">মন্তব্য</label>
          <textarea name="remarks" defaultValue={editingOfficeRent?.remarks} rows={2} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
        <button type="submit" className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm">
          {editingOfficeRent ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
        </button>
      </div>
    </form>
  );
};

interface LandlordFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  editingLandlord: Landlord | null;
  onCancel: () => void;
  formKey: number;
}

const LandlordForm = ({ onSubmit, editingLandlord, onCancel, formKey }: LandlordFormProps) => {
  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ঘর মালিক নাম</label>
          <input required name="name" defaultValue={editingLandlord?.name} type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">মোবাইল নাম্বার</label>
          <input required name="mobile" defaultValue={editingLandlord?.mobile} type="tel" className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">ঠিকানা</label>
          <textarea required name="address" defaultValue={editingLandlord?.address} rows={2} className="w-full px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">বাতিল</button>
        <button type="submit" className="px-6 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm">{editingLandlord ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}</button>
      </div>
    </form>
  );
};

// --- Landlord List View ---
interface LandlordListViewProps {
  landlords: Landlord[];
  societyInfo: any;
}

const LandlordListView = ({ landlords, societyInfo }: LandlordListViewProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const totalPages = Math.ceil(landlords.length / itemsPerPage);
  const displayedLandlords = landlords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <User className="text-emerald-600" />
          ঘর মালিকের লিস্ট
        </h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ExcelHeader title="ঘর মালিকের তালিকা" societyInfo={societyInfo} />

        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse border border-gray-400 text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FCE4D6]">
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center whitespace-nowrap">ক্রমিক</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-left whitespace-nowrap">ঘর মালিকের নাম</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-center whitespace-nowrap">মোবাইল নাম্বার</th>
                <th className="border border-gray-400 p-2 text-blue-800 font-bold text-left whitespace-nowrap">ঠিকানা</th>
              </tr>
            </thead>
            <tbody>
              {displayedLandlords.map((landlord, idx) => (
                <tr key={landlord.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 text-center whitespace-nowrap">{toBengaliNumber((currentPage - 1) * itemsPerPage + idx + 1)}</td>
                  <td className="border border-gray-300 p-2 font-bold text-left whitespace-nowrap">{landlord.name}</td>
                  <td className="border border-gray-300 p-2 text-center font-bold whitespace-nowrap">{toBengaliNumber(landlord.mobile)}</td>
                  <td className="border border-gray-300 p-2 text-left whitespace-nowrap">{landlord.address}</td>
                </tr>
              ))}
              {displayedLandlords.length === 0 && (
                <tr>
                  <td colSpan={4} className="border border-gray-300 p-8 text-center text-gray-400 italic">
                    কোন ঘর মালিকের তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-6 border-t pt-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  currentPage === page 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-50' 
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {toBengaliNumber(page)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Office Rent Report View ---
interface OfficeRentReportViewProps {
  officeRents: OfficeRent[];
  landlords: Landlord[];
  societyInfo: any;
}

const getDueAndAdvanceDetails = (parsedLatest: { month: number; year: number } | null, refYear: number, refMonth: number) => {
  if (!parsedLatest) return { dues: [], advances: [] };
  
  const dues: string[] = [];
  const advances: string[] = [];
  
  const bengaliMonths = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];

  const latestTotalMonths = parsedLatest.year * 12 + (parsedLatest.month - 1);
  const refTotalMonths = refYear * 12 + (refMonth - 1);
  
  if (refTotalMonths > latestTotalMonths) {
    for (let m = latestTotalMonths + 1; m <= refTotalMonths; m++) {
      const year = Math.floor(m / 12);
      const monthIdx = m % 12;
      const monthName = bengaliMonths[monthIdx];
      dues.push(`${monthName}-${toBengaliNumber(year)}`);
    }
  } else if (latestTotalMonths > refTotalMonths) {
    for (let m = refTotalMonths + 1; m <= latestTotalMonths; m++) {
      const year = Math.floor(m / 12);
      const monthIdx = m % 12;
      const monthName = bengaliMonths[monthIdx];
      advances.push(`${monthName}-${toBengaliNumber(year)}`);
    }
  }
  
  return { dues, advances };
};

const OfficeRentReportView = ({ officeRents, landlords, societyInfo }: OfficeRentReportViewProps) => {
  const [selectedLandlordId, setSelectedLandlordId] = useState('');
  const [selectedReportDetail, setSelectedReportDetail] = useState<{
    landlordName: string;
    dues: string[];
    advances: string[];
    lastPaidMonth: string;
  } | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setSelectedReportDetail(null);
    };

    if (selectedReportDetail) {
      window.history.pushState({ modalOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedReportDetail]);

  const closeReportDetail = () => {
    if (window.history.state?.modalOpen) {
      window.history.back();
    } else {
      setSelectedReportDetail(null);
    }
  };

  const parsedMonthsMap: { [key: string]: number } = {
    'জানুয়ারি': 1, 'ফেব্রুয়ারি': 2, 'মার্চ': 3, 'এপ্রিল': 4, 'মে': 5, 'জুন': 6,
    'জুলাই': 7, 'আগস্ট': 8, 'সেপ্টেম্বর': 9, 'অক্টোবর': 10, 'নভেম্বর': 11, 'ডিসেম্বর': 12
  };

  const parseRentMonth = (rentMonthStr: string) => {
    if (!rentMonthStr) return null;
    let targetStr = rentMonthStr;
    if (rentMonthStr.includes(' হতে ')) {
      const parts = rentMonthStr.split(' হতে ');
      if (parts.length === 2) {
        targetStr = parts[1];
      }
    }
    const parts = targetStr.split('-');
    if (parts.length !== 2) return null;
    const mStr = parts[0];
    const yStr = toEnglishNumber(parts[1]);
    const mNum = parsedMonthsMap[mStr] || 0;
    const yNum = parseInt(yStr) || 0;
    if (mNum === 0 || yNum === 0) return null;
    return { month: mNum, year: yNum };
  };

  const getBengaliTodayDate = () => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = String(today.getFullYear()).slice(-2);
    return toBengaliNumber(`${d}-${m}-${y}`);
  };

  const formatDateShort = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return '---';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const shortYear = year.slice(-2);
    return toBengaliNumber(`${day}-${month}-${shortYear}`);
  };

  const handleShowReportDetail = (landlord: Landlord) => {
    const landlordRents = officeRents.filter(r => 
      r.landlord_id === landlord.id || 
      (!r.landlord_id && r.landlord_name === landlord.name)
    );

    if (landlordRents.length === 0) {
      setSelectedReportDetail({
        landlordName: landlord.name,
        dues: [],
        advances: [],
        lastPaidMonth: '---'
      });
      return;
    }

    const sortedChronologically = [...landlordRents].filter(r => parseRentMonth(r.rent_month) !== null).sort((a, b) => {
      const parsedA = parseRentMonth(a.rent_month)!;
      const parsedB = parseRentMonth(b.rent_month)!;
      if (parsedA.year !== parsedB.year) {
        return parsedA.year - parsedB.year;
      }
      return parsedA.month - parsedB.month;
    });
    const latestRentMonthDoc = sortedChronologically[sortedChronologically.length - 1];

    if (!latestRentMonthDoc) {
      setSelectedReportDetail({
        landlordName: landlord.name,
        dues: [],
        advances: [],
        lastPaidMonth: '---'
      });
      return;
    }

    const parsedLatest = parseRentMonth(latestRentMonthDoc.rent_month);
    const today = new Date();
    const refDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const refYear = refDate.getFullYear();
    const refMonth = refDate.getMonth() + 1;

    const { dues, advances } = getDueAndAdvanceDetails(parsedLatest, refYear, refMonth);

    setSelectedReportDetail({
      landlordName: landlord.name,
      dues,
      advances,
      lastPaidMonth: latestRentMonthDoc.rent_month
    });
  };

  const calculateReportForLandlord = (landlord: Landlord) => {
    const landlordRents = officeRents.filter(r => 
      r.landlord_id === landlord.id || 
      (!r.landlord_id && r.landlord_name === landlord.name)
    );
    
    if (landlordRents.length === 0) {
      return {
        landlordName: landlord.name,
        todayDate: getBengaliTodayDate(),
        lastPaymentDate: '---',
        lastRentMonth: '---',
        lastPaidAmount: '---',
        dueMonthsCount: '---',
        advanceMonthsCount: '---'
      };
    }

    const sortedByPaymentDate = [...landlordRents].sort((a, b) => {
      return b.payment_date.localeCompare(a.payment_date);
    });
    const lastPayment = sortedByPaymentDate[0];

    const sortedChronologically = [...landlordRents].filter(r => parseRentMonth(r.rent_month) !== null).sort((a, b) => {
      const parsedA = parseRentMonth(a.rent_month)!;
      const parsedB = parseRentMonth(b.rent_month)!;
      if (parsedA.year !== parsedB.year) {
        return parsedA.year - parsedB.year;
      }
      return parsedA.month - parsedB.month;
    });
    const latestRentMonthDoc = sortedChronologically[sortedChronologically.length - 1];
    
    let dueMonths = 0;
    let advanceMonths = 0;
    if (latestRentMonthDoc) {
      const parsedLatest = parseRentMonth(latestRentMonthDoc.rent_month);
      if (parsedLatest) {
        const today = new Date();
        const refDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const refYear = refDate.getFullYear();
        const refMonth = refDate.getMonth() + 1;
        
        const diff = (refYear - parsedLatest.year) * 12 + (refMonth - parsedLatest.month);
        if (diff > 0) {
          dueMonths = diff;
          advanceMonths = 0;
        } else if (diff < 0) {
          dueMonths = 0;
          advanceMonths = Math.abs(diff);
        } else {
          dueMonths = 0;
          advanceMonths = 0;
        }
      }
    }

    const parsedLatest = latestRentMonthDoc ? parseRentMonth(latestRentMonthDoc.rent_month) : null;
    const today = new Date();
    const refDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const refYear = refDate.getFullYear();
    const refMonth = refDate.getMonth() + 1;
    const { dues, advances } = getDueAndAdvanceDetails(parsedLatest, refYear, refMonth);

    return {
      landlordName: landlord.name,
      todayDate: getBengaliTodayDate(),
      lastPaymentDate: formatDateShort(lastPayment.payment_date),
      lastRentMonth: latestRentMonthDoc ? latestRentMonthDoc.rent_month : '---',
      lastPaidAmount: formatCurrency(lastPayment.amount),
      dueMonthsCount: latestRentMonthDoc ? `${toBengaliNumber(dueMonths)} মাস` : '---',
      advanceMonthsCount: latestRentMonthDoc ? `${toBengaliNumber(advanceMonths)} মাস` : '---',
      dues,
      advances
    };
  };

  const filteredLandlords = selectedLandlordId === ''
    ? landlords
    : landlords.filter(l => l.id === selectedLandlordId);

  const reportData = filteredLandlords.map(calculateReportForLandlord);

  const today = new Date();
  const refDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const refMonthName = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ][refDate.getMonth()];
  const refYearBengali = toBengaliNumber(refDate.getFullYear());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-black text-gray-900 flex items-center gap-1">
          <FileText size={18} className="text-emerald-600" />
          অফিস ভাড়ার রিপোর্ট
        </h2>

        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-300 font-bangla">
          <label className="text-xs font-bold text-gray-600 whitespace-nowrap">ঘর মালিক:</label>
          <select
            value={selectedLandlordId}
            onChange={(e) => setSelectedLandlordId(e.target.value)}
            className="text-xs outline-none bg-transparent font-bold text-gray-700 cursor-pointer"
          >
            <option value="">সকল ঘর মালিক</option>
            {landlords.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse border border-black text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FCE4D6]">
                <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">আজকের তারিখ</th>
                <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">সর্ব শেষ প্রদানের তারিখ</th>
                <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">সর্বশেষ ভাড়া মাস (মাস-বর্ষ)</th>
                <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">সর্বশেষ পরিশোধিত টাকার পরিমাণ</th>
                <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">বকেয়া মাস সংখ্যা</th>
                <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">অগ্রিম ভাড়া প্রদান</th>
                <th className="border border-black p-3 text-blue-900 font-black text-left whitespace-nowrap">ঘর মালিকের নাম</th>
                <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">একশন</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="border border-black p-3 text-center font-bold text-gray-800 whitespace-nowrap">{row.todayDate}</td>
                  <td className="border border-black p-3 text-center font-bold text-gray-800 whitespace-nowrap">{row.lastPaymentDate}</td>
                  <td className="border border-black p-3 text-center font-bold text-emerald-700 whitespace-nowrap">{row.lastRentMonth}</td>
                  <td className="border border-black p-3 text-center font-black text-emerald-600 whitespace-nowrap">{row.lastPaidAmount}</td>
                  <td className="border border-black p-3 text-center font-bold text-red-600 whitespace-nowrap">{row.dueMonthsCount}</td>
                  <td className="border border-black p-3 text-center font-bold text-emerald-600 whitespace-nowrap">{row.advanceMonthsCount}</td>
                  <td className="border border-black p-3 text-left font-bold text-gray-800 whitespace-nowrap">{row.landlordName}</td>
                  <td className="border border-black p-3 text-center whitespace-nowrap">
                    <button 
                      onClick={() => handleShowReportDetail(filteredLandlords[idx])} 
                      className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-full transition-all inline-flex items-center justify-center"
                      title="বিস্তারিত বকেয়া ও অগ্রিম দেখুন"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr>
                  <td colSpan={8} className="border border-black p-8 text-center text-gray-400 italic font-bold whitespace-nowrap">
                    কোন তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReportDetail && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col font-sans text-gray-900 pb-safe">
          {/* Top Navigation Bar */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 shadow-sm pt-safe pl-safe pr-safe">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button 
                  onClick={closeReportDetail}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 hover:text-gray-800"
                  title="ফিরে যান"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">বকেয়া ও অগ্রিম বিবরণী</span>
                  <h1 className="text-sm sm:text-lg font-black text-gray-900 leading-tight">অফিস ভাড়া রিপোর্ট বিস্তারিত</h1>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 bg-white">
            <div className="w-full px-2 py-4 space-y-6">
              {/* Landlord Info Card */}
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FCE4D6]">
                      <th colSpan={2} className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">বকেয়া ও অগ্রিম বিবরণী</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-3 bg-gray-50 text-gray-700 font-bold whitespace-nowrap w-1/3">ঘর মালিকের নাম</td>
                      <td className="border border-black p-3 font-bold text-gray-800 whitespace-nowrap">{selectedReportDetail.landlordName}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-3 bg-gray-50 text-gray-700 font-bold whitespace-nowrap">সর্বশেষ পরিশোধিত ভাড়া মাস</td>
                      <td className="border border-black p-3 font-bold text-emerald-700 whitespace-nowrap">{selectedReportDetail.lastPaidMonth}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-3 bg-gray-50 text-gray-700 font-bold whitespace-nowrap">হিসাবের সর্বশেষ মাস ({refMonthName}-{refYearBengali} পর্যন্ত)</td>
                      <td className="border border-black p-3 font-bold text-gray-800 whitespace-nowrap">{refMonthName}-{refYearBengali}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Two Column Layout for Due and Advance Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                
                {/* Due Months Card */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 px-1">
                    <h3 className="text-sm sm:text-base font-black text-red-600 whitespace-nowrap">
                      বকেয়া মাসসমূহ (Outstanding)
                    </h3>
                    <span className="px-2.5 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-bold whitespace-nowrap">
                      মোট {toBengaliNumber(selectedReportDetail.dues.length)} মাস
                    </span>
                  </div>

                  {selectedReportDetail.dues.length > 0 ? (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-[#FCE4D6]">
                            <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap w-16">ক্রমিক</th>
                            <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">মাসের নাম</th>
                            <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap w-24">অবস্থা</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReportDetail.dues.map((month, i) => (
                            <tr key={i} className="hover:bg-red-50/10">
                              <td className="border border-black p-3 text-center font-bold text-gray-800 whitespace-nowrap">{toBengaliNumber(i + 1)}</td>
                              <td className="border border-black p-3 text-center font-bold text-gray-800 whitespace-nowrap">{month}</td>
                              <td className="border border-black p-3 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-black whitespace-nowrap">
                                  বকেয়া
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                      <p className="text-gray-500 font-bold text-sm whitespace-nowrap">কোন বকেয়া ভাড়া নেই।</p>
                    </div>
                  )}
                </div>

                {/* Advance Months Card */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 px-1">
                    <h3 className="text-sm sm:text-base font-black text-emerald-600 whitespace-nowrap">
                      অগ্রিম ভাড়া প্রদানকৃত মাসসমূহ (Advance)
                    </h3>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold whitespace-nowrap">
                      মোট {toBengaliNumber(selectedReportDetail.advances.length)} মাস
                    </span>
                  </div>

                  {selectedReportDetail.advances.length > 0 ? (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-[#FCE4D6]">
                            <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap w-16">ক্রমিক</th>
                            <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap">মাসের নাম</th>
                            <th className="border border-black p-3 text-blue-900 font-black text-center whitespace-nowrap w-24">অবস্থা</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReportDetail.advances.map((month, i) => (
                            <tr key={i} className="hover:bg-emerald-50/10">
                              <td className="border border-black p-3 text-center font-bold text-gray-800 whitespace-nowrap">{toBengaliNumber(i + 1)}</td>
                              <td className="border border-black p-3 text-center font-bold text-gray-800 whitespace-nowrap">{month}</td>
                              <td className="border border-black p-3 text-center whitespace-nowrap">
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black whitespace-nowrap">
                                  অগ্রিম
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-[#fcfcfc] border border-dashed border-gray-300 rounded-xl">
                      <p className="text-gray-500 font-bold text-sm whitespace-nowrap">কোন অগ্রিম ভাড়া প্রদান করা হয়নি।</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- Risky Investment Public View ---
interface RiskyInvestmentsViewProps {
  riskyLoans: RiskyLoan[];
  riskyInstallments: RiskyInstallment[];
  societyInfo: any;
}

const RiskyInvestmentsView = ({ riskyLoans, riskyInstallments, societyInfo }: RiskyInvestmentsViewProps) => {
  const [filter, setFilter] = useState<'সকল' | 'অনিয়মিত ঋণগ্রহীতা' | 'ঋণ খেলাপি'>('সকল');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDetailRiskyLoan, setSelectedDetailRiskyLoan] = useState<RiskyLoan | null>(null);
  const [selectedTransactionRiskyLoan, setSelectedTransactionRiskyLoan] = useState<RiskyLoan | null>(null);
  const [detailImageError, setDetailImageError] = useState(false);

  const activeRiskyLoans = [...riskyLoans]
    .filter(l => l.total_due > 0 && l.status !== 'পরিশোধিত')
    .sort((a, b) => {
      const startA = a.start_date || '';
      const startB = b.start_date || '';
      if (startA && startB) {
        return startA.localeCompare(startB);
      }
      if (startA) return -1;
      if (startB) return 1;
      return 0;
    });

  const filteredLoans = activeRiskyLoans.filter(l => {
    const matchesFilter = filter === 'সকল' || l.status === filter;
    const matchesSearch = searchQuery === '' || 
      l.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.account_no.toString().includes(searchQuery) ||
      toBengaliNumber(l.account_no).includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const itemsPerPage = 30;
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const displayedLoans = filteredLoans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    if (selectedDetailRiskyLoan) {
      setDetailImageError(false);
    }
  }, [selectedDetailRiskyLoan]);

  useEffect(() => {
    const handlePopState = () => {
      setSelectedDetailRiskyLoan(null);
    };
    if (selectedDetailRiskyLoan) {
      window.history.pushState({ modalOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedDetailRiskyLoan]);

  useEffect(() => {
    const handlePopState = () => {
      setSelectedTransactionRiskyLoan(null);
    };
    if (selectedTransactionRiskyLoan) {
      window.history.pushState({ modalOpen: true }, '');
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedTransactionRiskyLoan]);

  const closeDetail = () => {
    if (window.history.state?.modalOpen) {
      window.history.back();
    } else {
      setSelectedDetailRiskyLoan(null);
    }
  };

  const closeTransactions = () => {
    if (window.history.state?.modalOpen) {
      window.history.back();
    } else {
      setSelectedTransactionRiskyLoan(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
          <AlertTriangle size={24} className="text-red-600 animate-pulse" />
          ঝুঁকিপূর্ণ বিনিয়োগ
        </h2>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center font-bangla w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <input 
              type="text" 
              placeholder="নাম বা হিসাব নাম্বার দিয়ে খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 pl-10 pr-9 py-2.5 text-sm font-bold rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-red-500 bg-white"
            />
            <Search className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select 
            value={filter}
            onChange={(e: any) => setFilter(e.target.value)}
            className="bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 cursor-pointer outline-none focus:ring-2 focus:ring-red-500 appearance-none text-center min-w-[140px]"
          >
            <option value="সকল">ফিল্টার: সকল</option>
            <option value="অনিয়মিত ঋণগ্রহীতা">ফিল্টার: অনিয়মিত ঋণগ্রহীতা</option>
            <option value="ঋণ খেলাপি">ফিল্টার: ঋণ খেলাপি</option>
          </select>
        </div>
      </div>

      <div className="w-full overflow-x-auto px-1 pb-1 border-none shadow-none bg-transparent">
        <div className="max-h-[65vh] overflow-y-auto border-none shadow-none bg-transparent">
          <table className="min-w-[1100px] w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#FCE4D6] sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.1)]">
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-center whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">ক্রমিক</th>
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-left whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">গ্রাহকের নাম</th>
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-center whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">হিসাব নাম্বার</th>
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-center whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">বিনিয়োগের পরিমাণ</th>
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-center whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">মোট পরিশোধিত</th>
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-center whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">বকেয়া</th>
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-center whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">সময় কাল</th>
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-center whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">স্ট্যাটাস</th>
                <th className="border border-gray-400 py-1 px-1.5 text-blue-800 font-extrabold text-center whitespace-nowrap bg-[#FCE4D6] sticky top-0 z-10">একশন</th>
              </tr>
            </thead>
            <tbody>
              {displayedLoans.map((loan, idx) => (
                <tr key={loan.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="border border-gray-300 py-1 px-1.5 text-center whitespace-nowrap font-medium">
                    {toBengaliNumber((currentPage - 1) * itemsPerPage + idx + 1)}
                  </td>
                  <td className="border border-gray-300 py-1 px-1.5 font-black text-left whitespace-nowrap">
                    {loan.customer_name}
                  </td>
                  <td className="border border-gray-300 py-1 px-1.5 text-center whitespace-nowrap font-bold">
                    {toBengaliNumber(loan.account_no)}
                  </td>
                  <td className="border border-gray-300 py-1 px-1.5 text-center whitespace-nowrap font-bold text-indigo-700">
                    {formatCurrency(loan.amount)}
                  </td>
                  <td className="border border-gray-300 py-1 px-1.5 text-center whitespace-nowrap text-emerald-700 font-black">
                    {formatCurrency(loan.total_paid)}
                  </td>
                  <td className="border border-gray-300 py-1 px-1.5 text-center whitespace-nowrap text-red-600 font-black">
                    {formatCurrency(loan.total_due)}
                  </td>
                  <td className="border border-gray-300 py-1 px-1.5 text-center whitespace-nowrap text-gray-700 font-medium">
                    {loan.start_date && loan.end_date ? `${formatDate(loan.start_date)} হতে ${formatDate(loan.end_date)}` : '---'}
                  </td>
                  <td className="border border-gray-300 py-1 px-1.5 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block ${
                      loan.status === 'অনিয়মিত ঋণগ্রহীতা' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="border border-gray-300 py-1 px-1.5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedTransactionRiskyLoan(loan)}
                        className="p-1 hover:bg-indigo-50 hover:text-indigo-800 rounded-lg text-indigo-600 transition-colors"
                        title="লেনদেন ইতিহাস"
                      >
                        <History size={16} />
                      </button>
                      <button 
                        onClick={() => setSelectedDetailRiskyLoan(loan)}
                        className="p-1 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg text-emerald-600 transition-colors"
                        title="বিস্তারিত বিবরণ"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedLoans.length === 0 && (
                <tr>
                  <td colSpan={9} className="border border-gray-300 py-1 px-1.5 text-center text-gray-400 italic">
                    কোন ঝুঁকিপূর্ণ বিনিয়োগের তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-6 border-t pt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                currentPage === page 
                  ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-50' 
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {toBengaliNumber(page)}
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedDetailRiskyLoan && (
          <div className="fixed inset-0 bg-white z-[120] flex flex-col overflow-y-auto pb-safe">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full min-h-screen bg-white font-sans text-gray-900 flex flex-col"
            >
              <div className="p-4 sm:p-6 bg-red-600 flex items-center text-white sticky top-0 z-10 shadow-md pt-safe pl-safe pr-safe">
                <div className="flex items-center gap-3">
                  <button onClick={closeDetail} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors" title="পিছনে যান">
                    <ArrowLeft size={24} />
                  </button>
                  <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                    ঝুঁকিপূর্ণ বিনিয়োগের বিস্তারিত
                  </h3>
                </div>
              </div>

              <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6 font-bangla pb-20">
                {/* Customer Photo Section */}
                <div className="flex flex-col items-center text-center space-y-3 pb-5 border-b border-gray-100">
                  <div className="relative">
                    {selectedDetailRiskyLoan.photo_url && !detailImageError ? (
                      <img 
                        src={getDirectGoogleDriveImageUrl(selectedDetailRiskyLoan.photo_url)} 
                        alt={selectedDetailRiskyLoan.customer_name}
                        referrerPolicy="no-referrer"
                        className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-red-500 shadow-md bg-gray-50"
                        onError={() => setDetailImageError(true)}
                      />
                    ) : (
                      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-red-50 border-4 border-red-100 shadow-sm flex items-center justify-center text-red-500 mx-auto">
                        <User size={64} className="stroke-[1.5]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-900">{selectedDetailRiskyLoan.customer_name}</h4>
                    <p className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-block mt-1">
                      হিসাব নাম্বার: {toBengaliNumber(selectedDetailRiskyLoan.account_no)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <tbody>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold w-1/2">বাবার নাম</td>
                        <td className="border p-3">{selectedDetailRiskyLoan.father_name || '---'}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">মোবাইল নাম্বার</td>
                        <td className="border p-3 font-semibold">{selectedDetailRiskyLoan.mobile_no ? toBengaliNumber(selectedDetailRiskyLoan.mobile_no) : '---'}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">ঠিকানা</td>
                        <td className="border p-3">{selectedDetailRiskyLoan.address || '---'}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">জামিনদারের নাম</td>
                        <td className="border p-3">{selectedDetailRiskyLoan.guarantor_name || '---'}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">বিনিয়োগের সময়কাল</td>
                        <td className="border p-3">
                          {selectedDetailRiskyLoan.start_date && selectedDetailRiskyLoan.end_date 
                            ? `${formatDate(selectedDetailRiskyLoan.start_date)} হতে ${formatDate(selectedDetailRiskyLoan.end_date)}` 
                            : '---'}
                        </td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">বিনিয়োগের পরিমাণ</td>
                        <td className="border p-3 font-bold text-indigo-600">{formatCurrency(selectedDetailRiskyLoan.amount)}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">মুনাফাসহ মোট</td>
                        <td className="border p-3 font-bold text-indigo-700">{formatCurrency(selectedDetailRiskyLoan.total_with_profit)}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">মোট পরিশোধিত</td>
                        <td className="border p-3 font-bold text-emerald-700">{formatCurrency(selectedDetailRiskyLoan.total_paid)}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">মোট বকেয়া</td>
                        <td className="border p-3 font-bold text-red-600">{formatCurrency(selectedDetailRiskyLoan.total_due)}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">ঋণ খেলাপি জরিমানা</td>
                        <td className="border p-3 font-bold text-amber-600">{formatCurrency(selectedDetailRiskyLoan.penalty)}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">ঋণ খেলাপি জরিমানাসহ মোট বকেয়া</td>
                        <td className="border p-3 font-bold text-red-700">{formatCurrency(selectedDetailRiskyLoan.total_due_with_penalty)}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">সাধারণ সঞ্চয় জমা</td>
                        <td className="border p-3 font-bold text-emerald-600">{formatCurrency(selectedDetailRiskyLoan.savings_deposit)}</td>
                      </tr>
                      <tr className="bg-amber-50 border-2 border-amber-200">
                        <td className="border border-amber-200 p-3 bg-amber-100/50 font-bold text-amber-900">সর্বশেষ কিস্তি পরিশোধের তারিখ</td>
                        <td className="border border-amber-200 p-3 font-extrabold text-amber-950">
                          {selectedDetailRiskyLoan.last_payment_date ? formatDate(selectedDetailRiskyLoan.last_payment_date) : '---'}
                        </td>
                      </tr>
                      <tr className="bg-amber-50 border-2 border-amber-200">
                        <td className="border border-amber-200 p-3 bg-amber-100/50 font-bold text-amber-900">সর্বশেষ প্রদানকৃত টাকার পরিমান</td>
                        <td className="border border-amber-200 p-3 font-extrabold text-amber-950">
                          {formatCurrency(selectedDetailRiskyLoan.last_payment_amount)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border p-3 bg-gray-50 font-bold">স্ট্যাটাস</td>
                        <td className="border p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            selectedDetailRiskyLoan.status === 'অনিয়মিত ঋণগ্রহীতা' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {selectedDetailRiskyLoan.status}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transactions Modal */}
      <AnimatePresence>
        {selectedTransactionRiskyLoan && (
          <div className="fixed inset-0 bg-white z-[120] flex flex-col overflow-y-auto pb-safe">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="w-full min-h-screen bg-white font-sans text-gray-900 flex flex-col"
            >
              <div className="p-4 sm:p-6 bg-indigo-600 flex items-center text-white sticky top-0 z-10 shadow-md pt-safe pl-safe pr-safe">
                <div className="flex items-center gap-3">
                  <button onClick={closeTransactions} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors" title="পিছনে যান">
                    <ArrowLeft size={24} />
                  </button>
                  <h3 className="text-lg sm:text-xl font-black flex items-center gap-2">
                    <History size={24} /> 
                    লেনদেন ইতিহাস - {selectedTransactionRiskyLoan.customer_name}
                  </h3>
                </div>
              </div>

              <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8 font-bangla pb-20">
                {/* Table 1: Details Table */}
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-indigo-900 flex items-center gap-2 mb-3 pb-1 border-b border-indigo-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
                    বিনিয়োগের সংক্ষিপ্ত বিবরণী
                  </h4>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-3 text-center font-bold whitespace-nowrap">গ্রাহকের নাম</th>
                          <th className="border border-gray-300 p-3 text-center font-bold whitespace-nowrap">হিসাব নাম্বার</th>
                          <th className="border border-gray-300 p-3 text-center font-bold whitespace-nowrap">বিনিয়োগের পরিমাণ</th>
                          <th className="border border-gray-300 p-3 text-center font-bold whitespace-nowrap">মোট পরিশোধিত</th>
                          <th className="border border-gray-300 p-3 text-center font-bold whitespace-nowrap">বকেয়া</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-gray-50/50">
                          <td className="border border-gray-300 p-3 text-center font-bold text-gray-900 whitespace-nowrap">{selectedTransactionRiskyLoan.customer_name}</td>
                          <td className="border border-gray-300 p-3 text-center font-bold text-gray-700 whitespace-nowrap">{toBengaliNumber(selectedTransactionRiskyLoan.account_no)}</td>
                          <td className="border border-gray-300 p-3 text-center font-bold text-indigo-600 whitespace-nowrap">{formatCurrency(selectedTransactionRiskyLoan.amount)}</td>
                          <td className="border border-gray-300 p-3 text-center font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(selectedTransactionRiskyLoan.total_paid)}</td>
                          <td className="border border-gray-300 p-3 text-center font-black text-red-600 whitespace-nowrap">{formatCurrency(selectedTransactionRiskyLoan.total_due)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 2: Transactions List */}
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-emerald-900 flex items-center gap-2 mb-3 pb-1 border-b border-emerald-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                    কিস্তি আদায়ের ইতিহাস ও লেনদেন তালিকা
                  </h4>
                  <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-emerald-50 text-emerald-950">
                          <th className="border border-gray-300 p-3 text-center font-bold whitespace-nowrap">ক্রমিক</th>
                          <th className="border border-gray-300 p-3 text-center font-bold whitespace-nowrap">তারিখ</th>
                          <th className="border border-gray-300 p-3 text-center font-bold whitespace-nowrap">টাকার পরিমান</th>
                          <th className="border border-gray-300 p-3 text-left font-bold whitespace-nowrap">নোট</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskyInstallments
                          .filter(t => t.account_no === selectedTransactionRiskyLoan.account_no)
                          .map((t, idx) => (
                            <tr key={t.id} className="hover:bg-emerald-50/30 transition-colors">
                              <td className="border border-gray-300 p-3 text-center font-medium whitespace-nowrap">{toBengaliNumber(idx + 1)}</td>
                              <td className="border border-gray-300 p-3 text-center whitespace-nowrap">{formatDate(t.date)}</td>
                              <td className="border border-gray-300 p-3 text-center font-bold text-emerald-700 whitespace-nowrap">{formatCurrency(t.amount)}</td>
                              <td className="border border-gray-300 p-3 text-left text-gray-700 font-medium whitespace-nowrap">{t.note || '---'}</td>
                            </tr>
                          ))}
                        {riskyInstallments.filter(t => t.account_no === selectedTransactionRiskyLoan.account_no).length === 0 && (
                          <tr>
                            <td colSpan={4} className="border border-gray-300 p-8 text-center text-gray-400 italic font-semibold whitespace-nowrap">
                              কোন লেনদেনের তথ্য পাওয়া যায়নি
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
