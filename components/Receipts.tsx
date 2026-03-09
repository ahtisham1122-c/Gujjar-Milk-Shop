
import React from 'react';
import { Customer, Delivery, Payment, PriceRecord } from '../types';
import { formatPKR, findPriceForDate, generateId } from '../services/dataStore';
import ThermalPrintView from './ThermalPrintView';

interface IndividualReceiptProps {
  customer: Customer;
  deliveries: Delivery[];
  payments: Payment[];
  prices: PriceRecord[];
  balances: Record<string, number>;
  profile: '80' | '58' | 'A4';
  fontSize: 'sm' | 'md' | 'lg';
}

export const IndividualReceipt: React.FC<IndividualReceiptProps> = ({
  customer,
  deliveries,
  payments,
  prices,
  balances,
  profile,
  fontSize
}) => {
  const now = new Date();
  const today = now.toLocaleDateString('en-CA');
  
  const currentMonthDeliveries = deliveries.filter(d => {
    const dDate = new Date(d.date);
    return d.customerId === customer.id && dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
  });

  const totalMilk = currentMonthDeliveries.reduce((a, b) => a + (b.liters || 0), 0);
  let milkRate = 0;
  try {
    milkRate = findPriceForDate(today, customer, prices);
  } catch(e) {
    milkRate = 210; 
  }
  
  const milkAmount = Math.round(totalMilk * milkRate);
  const netTotal = balances[customer.id] || 0;
  const remainingBalance = Math.round(netTotal - milkAmount);

  return (
    <ThermalPrintView 
      profile={profile} 
      fontSize={fontSize} 
      title="Gujjar Milk Shop" 
      subtitle="Digital Billing Slip"
    >
      <div className="space-y-1 text-xs">
        <div className="flex justify-between font-black">
          <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
          <span>Ref: #{generateId().substring(0, 4).toUpperCase()}</span>
        </div>
      </div>

      <div className="space-y-1 text-xs mt-2">
        <div className="flex justify-between font-black items-start">
          <span className="flex-shrink-0 mr-2">Customer:</span>
          <span className="text-right break-words">{customer.name}</span>
        </div>
        <div className="flex justify-between">
          <span>Account ID:</span>
          <span>{customer.id.substring(0, 6).toUpperCase()}</span>
        </div>
      </div>

      <div className="border-dashed-print my-2"></div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Monthly Milk:</span>
          <span className="font-black">{totalMilk.toFixed(1)}L</span>
        </div>
        <div className="flex justify-between">
          <span>Current Rate:</span>
          <span>Rs. {milkRate}</span>
        </div>
        <div className="flex justify-between font-black text-sm pt-1">
          <span>Current Bill:</span>
          <span>Rs. {formatPKR(milkAmount)}</span>
        </div>
      </div>

      <div className="border-dashed-print my-2"></div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Previous Dues:</span>
          <span>Rs. {formatPKR(remainingBalance)}</span>
        </div>
        <div className="flex justify-between font-black text-base pt-2 bg-slate-100 p-2">
          <span>NET PAYABLE:</span>
          <span>Rs. {formatPKR(netTotal)}</span>
        </div>
      </div>

      <div className="border-dashed-print my-4"></div>
      <div className="text-center space-y-1">
        <p className="font-black text-xs uppercase">Thank You for your Business!</p>
        <p className="text-[10px] opacity-70 italic">Please keep this receipt for your records.</p>
        <p className="text-[10px] opacity-50 pt-2">DairyPro Pakistan Cloud Ledger</p>
      </div>
    </ThermalPrintView>
  );
};

interface SummaryReceiptProps {
  date: string;
  customers: Customer[];
  deliveries: Delivery[];
  payments: Payment[];
  profile: '80' | '58' | 'A4';
  fontSize: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

export const SummaryReceipt: React.FC<SummaryReceiptProps> = ({
  date,
  customers,
  deliveries,
  payments,
  profile,
  fontSize,
  compact = false
}) => {
  const todayDeliveries = deliveries.filter(d => d.date === date && !d.isAdjustment);
  const todayPayments = payments.filter(p => p.date === date && !p.isAdjustment);
  
  const totalLiters = todayDeliveries.reduce((a, b) => a + (b.liters || 0), 0);
  const totalBill = todayDeliveries.reduce((a, b) => a + (b.totalAmount || 0), 0);
  const totalRecovery = todayPayments.reduce((a, b) => a + (b.amount || 0), 0);

  return (
    <ThermalPrintView 
      profile={profile} 
      fontSize={fontSize} 
      title="Gujjar Milk Shop" 
      subtitle={compact ? "Main Summary" : "Daily Summary Report"}
    >
      <div className="space-y-1 text-xs">
        <div className="flex justify-between font-black">
          <span>Date: {date}</span>
          <span>Ref: #{generateId().substring(0, 4).toUpperCase()}</span>
        </div>
      </div>

      <div className="border-dashed-print my-2"></div>

      <div className="space-y-3 text-xs">
        <div className="flex justify-between items-center py-1">
          <span className="font-black uppercase">Total Milk Delivered:</span>
          <span className="text-xl font-black italic">{totalLiters.toFixed(1)}L</span>
        </div>
        
        <div className="flex justify-between items-center py-1">
          <span className="font-black uppercase">Total Billing:</span>
          <span className="text-lg font-black italic">Rs. {formatPKR(totalBill)}</span>
        </div>

        <div className="flex justify-between items-center py-2 bg-slate-100 px-2 rounded-lg border-2 border-slate-900">
          <span className="font-black uppercase text-sm">Cash from Rider:</span>
          <span className="text-2xl font-black italic">Rs. {formatPKR(totalRecovery)}</span>
        </div>
      </div>

      {!compact && (
        <>
          <div className="border-dashed-print my-2"></div>
          <p className="text-center font-black uppercase text-xs">Customer Activity</p>
          <div className="border-dashed-print my-2"></div>

          <div className="space-y-3">
            {todayDeliveries.map((d, i) => {
              const cust = customers.find(c => c.id === d.customerId);
              return (
                <div key={i} className="flex justify-between items-start text-xs">
                  <div className="flex-1 mr-2">
                    <p className="font-black leading-tight break-words">{cust?.name}</p>
                    <p className="opacity-70 text-[10px]">Milk Delivery</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black">{d.liters.toFixed(1)}L</p>
                    <p className="text-[10px]">Rs.{formatPKR(d.totalAmount)}</p>
                  </div>
                </div>
              );
            })}
            {todayPayments.map((p, i) => {
              const cust = customers.find(c => c.id === p.customerId);
              return (
                <div key={`p-${i}`} className="flex justify-between items-start text-xs">
                  <div className="flex-1 mr-2">
                    <p className="font-black leading-tight break-words">{cust?.name}</p>
                    <p className="opacity-70 text-[10px] text-green-600">Cash Payment</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-green-600">Rs.{formatPKR(p.amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <div className="border-dashed-print my-4"></div>
      <div className="text-center space-y-1">
        <p className="font-black text-xs uppercase tracking-widest">End of Summary</p>
        <p className="text-[10px] opacity-50">DairyPro Pakistan • {date}</p>
      </div>
    </ThermalPrintView>
  );
};
