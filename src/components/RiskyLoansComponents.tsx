import React, { useState, useEffect, useRef } from 'react';
import { Plus, User } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';

// --- Horizontal Scroll Hook ---
const useHorizontalScroll = () => {
  const elRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      
      const canScrollLeft = el.scrollLeft > 0;
      const canScrollRight = el.scrollLeft < (el.scrollWidth - el.clientWidth);
      
      if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 1.2;
      }
    };

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

    const onMouseUp = () => {
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

// --- Interfaces ---
export interface Loan {
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

export interface RiskyLoan {
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

// --- Helper Functions ---
const toBengaliNumber = (num: number | string) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => bengaliDigits[parseInt(d)]);
};

const toEnglishNumber = (str: string) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[০-৯]/g, (d) => bengaliDigits.indexOf(d).toString());
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

// --- Components ---

interface RiskyLoansManagementProps {
  riskyLoans: RiskyLoan[];
  loans: Loan[];
}

export const RiskyLoansManagement: React.FC<RiskyLoansManagementProps> = ({ riskyLoans, loans }) => {
  const riskyLoansTableRef = useHorizontalScroll();
  const [customerName, setCustomerName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [address, setAddress] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
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
  const [editingRiskyLoan, setEditingRiskyLoan] = useState<RiskyLoan | null>(null);
  const [showRiskyLoanForm, setShowRiskyLoanForm] = useState(false);

  useEffect(() => {
    if (editingRiskyLoan) {
      setCustomerName(editingRiskyLoan.customer_name || '');
      setAccountNo(editingRiskyLoan.account_no || '');
      setFatherName(editingRiskyLoan.father_name || '');
      setMobileNo(editingRiskyLoan.mobile_no || '');
      setAddress(editingRiskyLoan.address || '');
      setGuarantorName(editingRiskyLoan.guarantor_name || '');
      setPhotoUrl(editingRiskyLoan.photo_url || '');
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
      setPhotoUrl('');
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
  }, [editingRiskyLoan, showRiskyLoanForm]);

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
      photo_url: photoUrl,
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
      console.error("Error deleting risky loan:", err);
      alert('মুছে ফেলতে সমস্যা হয়েছে: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex justify-between items-center border-b pb-4">
        <h3 className="text-lg font-bold text-gray-800">ঝুঁকিপূর্ণ বিনিয়োগ তালিকা ও ব্যবস্থাপনা</h3>
        <button 
          onClick={() => { setEditingRiskyLoan(null); setShowRiskyLoanForm(!showRiskyLoanForm); }}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-md shadow-emerald-50"
        >
          {showRiskyLoanForm ? 'তালিকা দেখুন' : <><Plus size={16} /> হিসাব যোগ করুন</>}
        </button>
      </div>

      {showRiskyLoanForm ? (
        <form onSubmit={handleRiskyLoanSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-1">গ্রাহকের নাম *</label>
              <input 
                type="text" 
                required
                value={customerName}
                onChange={handleCustomerNameChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="নাম লিখুন বা খুঁজুন..."
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
              <label className="block text-sm font-bold text-gray-700 mb-1">হিসাব নং *</label>
              <input 
                type="text" 
                required
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">পিতার নাম</label>
              <input 
                type="text" 
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">মোবাইল নাম্বার</label>
              <input 
                type="text" 
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">ঠিকানা</label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">জামিনদারের নাম</label>
              <input 
                type="text" 
                value={guarantorName}
                onChange={(e) => setGuarantorName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">গ্রাহকের ছবি URL (গুগল ড্রাইভ লিংক)</label>
              <input 
                type="text" 
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="গুগল ড্রাইভ লিংক..."
              />
            </div>

            <CurrencyInput name="amount" value={amount.toString()} onChange={(val) => setAmount(parseFloat(val) || 0)} label="বিনিয়োগের পরিমাণ *" required />
            <CurrencyInput name="total_with_profit" value={totalWithProfit.toString()} onChange={(val) => setTotalWithProfit(parseFloat(val) || 0)} label="মুনাফাসহ মোট *" required />
            <CurrencyInput name="total_paid" value={totalPaid.toString()} onChange={(val) => setTotalPaid(parseFloat(val) || 0)} label="মোট পরিশোধিত *" required />
            <CurrencyInput name="penalty" value={penalty.toString()} onChange={(val) => setPenalty(parseFloat(val) || 0)} label="খেলাপি জরিমানা বকেয়া" />
            <CurrencyInput name="savings_deposit" value={savingsDeposit.toString()} onChange={(val) => setSavingsDeposit(parseFloat(val) || 0)} label="গ্রাহকের সঞ্চয় জমা" />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">সর্বশেষ পরিশোধের তারিখ</label>
              <input 
                type="date" 
                value={lastPaymentDate}
                onChange={(e) => setLastPaymentDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <CurrencyInput name="last_payment_amount" value={lastPaymentAmount.toString()} onChange={(val) => setLastPaymentAmount(parseFloat(val) || 0)} label="সর্বশেষ পরিশোধের পরিমাণ" />

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">বিনিয়োগ প্রদানের তারিখ</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">মেয়াদ উত্তীর্ণের তারিখ</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">স্ট্যাটাস *</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
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
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              বাতিল
            </button>
            <button 
              type="submit" 
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-emerald-50"
            >
              {editingRiskyLoan ? 'হিসাব আপডেট করুন' : 'হিসাব যোগ করুন'}
            </button>
          </div>
        </form>
      ) : (
        <div ref={riskyLoansTableRef} className="overflow-x-auto w-full p-px cursor-grab active:cursor-grabbing desktop-scrollbar pb-2">
          <table className="min-w-[1000px] w-full border-collapse border border-gray-300 text-xs">
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
      )}
    </div>
  );
};

interface RiskyInstallmentCollectionProps {
  riskyLoans: RiskyLoan[];
}

export const RiskyInstallmentCollection: React.FC<RiskyInstallmentCollectionProps> = ({ riskyLoans }) => {
  const [accountNo, setAccountNo] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const [selectedLoan, setSelectedLoan] = useState<RiskyLoan | null>(null);
  const [accountSuggestions, setAccountSuggestions] = useState<RiskyLoan[]>([]);
  const [formKey, setFormKey] = useState(Date.now());

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

            <CurrencyInput name="amount" value={amount.toString()} onChange={(val) => setAmount(parseFloat(val) || 0)} label="আদায়ের পরিমাণ *" required />

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
};
