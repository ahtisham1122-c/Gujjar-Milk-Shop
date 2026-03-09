
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { 
  TrendingUp, Users, ClipboardList, Wallet, 
  ArrowUpRight, ArrowDownRight,
  BarChart3, Activity
} from 'lucide-react';
import { Customer, Delivery, Payment, Rider } from '../types';
import { Chart, registerables } from 'https://esm.sh/chart.js';

Chart.register(...registerables);

interface AnalyticsProps {
  customers: Customer[];
  deliveries: Delivery[];
  payments: Payment[];
  riders: Rider[];
  riderFilterId: string;
  balances: Record<string, number>;
}

const Analytics: React.FC<AnalyticsProps> = ({ 
  customers, deliveries, payments, riders, riderFilterId
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const chartRef1 = useRef<HTMLCanvasElement>(null);
  const chartRef2 = useRef<HTMLCanvasElement>(null);
  const chartRef3 = useRef<HTMLCanvasElement>(null);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const filteredData = useMemo(() => {
    const dFiltered = riderFilterId === 'all' ? (deliveries || []) : (deliveries || []).filter(d => d.riderId === riderFilterId);
    const pFiltered = (payments || []).filter(p => {
        const cust = (customers || []).find(c => c.id === p.customerId);
        return riderFilterId === 'all' || cust?.riderId === riderFilterId;
    });
    const cFiltered = riderFilterId === 'all' ? (customers || []) : (customers || []).filter(c => c.riderId === riderFilterId);

    return { deliveries: dFiltered, payments: pFiltered, customers: cFiltered };
  }, [deliveries, payments, customers, riderFilterId]);

  const stats = useMemo(() => {
    const currentMonthDeliveries = filteredData.deliveries.filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });

    const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYearIdx = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    
    const prevMonthDeliveries = filteredData.deliveries.filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === prevMonthIdx && date.getFullYear() === prevYearIdx;
    });

    const currentRevenue = currentMonthDeliveries.reduce((a, b) => a + (b.totalAmount || 0), 0);
    const prevRevenue = prevMonthDeliveries.reduce((a, b) => a + (b.totalAmount || 0), 0);
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const currentLiters = currentMonthDeliveries.reduce((a, b) => a + (b.liters || 0), 0);
    
    const currentPayments = filteredData.payments.filter(p => {
      const date = new Date(p.date);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
    const totalCollected = currentPayments.reduce((a, b) => a + (b.amount || 0), 0);
    const recoveryRate = currentRevenue > 0 ? (totalCollected / currentRevenue) * 100 : 0;

    const activeCustCount = filteredData.customers.filter(c => c.active).length;

    return { 
      currentRevenue, 
      revenueGrowth, 
      currentLiters, 
      recoveryRate, 
      activeCustCount,
      totalCollected,
      prevRevenue
    };
  }, [filteredData, selectedMonth, selectedYear]);

  useEffect(() => {
    if (!chartRef1.current || !chartRef2.current || !chartRef3.current) return;

    try {
      const charts = [chartRef1.current, chartRef2.current, chartRef3.current].map(canvas => Chart.getChart(canvas));
      charts.forEach(chart => chart?.destroy());

      const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonth - i, 1);
        last6Months.push({ month: d.getMonth(), year: d.getFullYear(), label: `${monthNamesShort[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}` });
      }

      const revenueData = last6Months.map(m => {
        return filteredData.deliveries
          .filter(d => {
            const date = new Date(d.date);
            return date.getMonth() === m.month && date.getFullYear() === m.year;
          })
          .reduce((a, b) => a + (b.totalAmount || 0), 0);
      });

      const collectionData = last6Months.map(m => {
          return filteredData.payments
            .filter(p => {
              const date = new Date(p.date);
              return date.getMonth() === m.month && date.getFullYear() === m.year;
            })
            .reduce((a, b) => a + (b.amount || 0), 0);
      });

      new Chart(chartRef1.current, {
        type: 'line',
        data: {
          labels: last6Months.map(m => m.label),
          datasets: [
            {
              label: 'Billing',
              data: revenueData,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              fill: true,
              tension: 0.4,
              borderWidth: 3,
            },
            {
              label: 'Collection',
              data: collectionData,
              borderColor: '#10b981',
              backgroundColor: 'transparent',
              tension: 0.4,
              borderWidth: 2,
              borderDash: [5, 5],
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { 
              y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
              x: { grid: { display: false } }
          }
        }
      });

      new Chart(chartRef2.current, {
        type: 'doughnut',
        data: {
          labels: ['Recovered', 'Pending'],
          datasets: [{
            data: [stats.totalCollected, Math.max(0, stats.currentRevenue - stats.totalCollected)],
            backgroundColor: ['#10b981', '#f1f5f9'],
            borderWidth: 0,
          }]
        },
        options: {
          cutout: '80%',
          plugins: { legend: { display: false } }
        }
      });

      const routeStats = (riders || []).map(r => {
          const liters = (deliveries || [])
              .filter(d => d.riderId === r.id && new Date(d.date).getMonth() === selectedMonth && new Date(d.date).getFullYear() === selectedYear)
              .reduce((a, b) => a + (b.liters || 0), 0);
          return { name: r.name, liters };
      }).sort((a, b) => b.liters - a.liters);

      new Chart(chartRef3.current, {
          type: 'bar',
          data: {
            labels: routeStats.map(r => r.name),
            datasets: [{
              label: 'Liters',
              data: routeStats.map(r => r.liters),
              backgroundColor: '#2563eb',
              borderRadius: 8,
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
          }
      });
    } catch (e) {
      console.warn("Analytics Chart Error:", e);
    }

  }, [stats, filteredData, selectedMonth, selectedYear, riders, deliveries]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="p-4 md:p-8 space-y-8 pb-40 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-100">
              <Activity size={28}/>
           </div>
           <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">MOM Trends</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                {riderFilterId === 'all' ? "HQ Global Data" : `Route: ${riders.find(r => r.id === riderFilterId)?.name}`}
              </p>
           </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
            <select className="bg-transparent font-black text-slate-700 outline-none text-[10px] uppercase tracking-widest px-4 py-2" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="bg-transparent font-black text-slate-700 outline-none text-[10px] uppercase tracking-widest px-4 py-2" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard title="Revenue" value={`Rs. ${stats.currentRevenue.toLocaleString()}`} change={stats.revenueGrowth} color="blue" icon={<TrendingUp size={20}/>} />
          <KpiCard title="Collection" value={`${stats.recoveryRate.toFixed(1)}%`} color="green" icon={<Wallet size={20}/>} />
          <KpiCard title="Liters" value={`${stats.currentLiters.toFixed(0)} L`} color="indigo" icon={<ClipboardList size={20}/>} />
          <KpiCard title="Clients" value={stats.activeCustCount.toString()} color="slate" icon={<Users size={20}/>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={18}/> 6-Month Trajectory
            </h3>
            <canvas ref={chartRef1} className="max-h-[300px]"></canvas>
         </div>

         <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative w-48 h-48">
                <canvas ref={chartRef2}></canvas>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-black text-slate-900 italic">{stats.recoveryRate.toFixed(0)}%</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Efficiency</p>
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-xl font-black text-slate-900 italic">Rs. {stats.totalCollected.toLocaleString()}</p>
                <p className="text-[10px] font-black text-green-600 uppercase">Total Cash In</p>
            </div>
         </div>
      </div>

      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={18}/> Route Volume (L)
          </h3>
          <canvas ref={chartRef3} className="max-h-[300px]"></canvas>
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, change, color, icon }: { title: string; value: string; change?: number; color: string; icon: React.ReactNode }) => {
    const isPositive = change > 0;
    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className={`p-3 rounded-2xl bg-${color}-50 text-${color}-600`}>{icon}</div>
                {change !== undefined && change !== 0 && (
                    <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {isPositive ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                        {Math.abs(change).toFixed(1)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{title}</p>
                <p className="text-2xl font-black text-slate-900 italic truncate">{value}</p>
            </div>
        </div>
    );
}

export default Analytics;
