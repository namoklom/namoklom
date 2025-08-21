import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Car,
  Coffee,
  Heart,
  Film,
  Zap,
  FileText,
  Wallet,
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Sparkles
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

const TransactionInsights = ({ transactions = [], balance = 0 }) => {
  const [activeTab, setActiveTab] = useState('pengeluaran');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Category configurations
  const categoryConfig = {
    'Makanan': { icon: Coffee, color: '#f97316', bgColor: 'bg-orange-500' },
    'Transportasi': { icon: Car, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'Perawatan': { icon: Heart, color: '#ec4899', bgColor: 'bg-pink-500' },
    'Hiburan': { icon: Film, color: '#a855f7', bgColor: 'bg-purple-500' },
    'Tagihan': { icon: Zap, color: '#eab308', bgColor: 'bg-yellow-500' },
    'Lainnya': { icon: FileText, color: '#6b7280', bgColor: 'bg-gray-500' },
    'income': { icon: Wallet, color: '#10b981', bgColor: 'bg-emerald-500' }
  };

  // Get month name in Indonesian
  const getMonthName = (month) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month];
  };

  // Validate and parse transaction date
  const parseTransactionDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Filter transactions by current month/year with proper validation
  const currentMonthTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    
    return transactions.filter(tx => {
      if (!tx || typeof tx !== 'object') return false;
      
      const txDate = parseTransactionDate(tx.date);
      if (!txDate) return false;
      
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });
  }, [transactions, currentMonth, currentYear]);

  // Calculate expenses and income with validation
  const expenses = useMemo(() => {
    return currentMonthTransactions.filter(tx => 
      tx && 
      tx.category && 
      tx.category !== 'income' && 
      typeof tx.price === 'number' && 
      tx.price >= 0
    );
  }, [currentMonthTransactions]);

  const income = useMemo(() => {
    return currentMonthTransactions.filter(tx => 
      tx && 
      tx.category === 'income' && 
      typeof tx.price === 'number' && 
      tx.price >= 0
    );
  }, [currentMonthTransactions]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, tx) => sum + (tx.price || 0), 0);
  }, [expenses]);

  const totalIncome = useMemo(() => {
    return income.reduce((sum, tx) => sum + (tx.price || 0), 0);
  }, [income]);

  // Category analysis with proper data structure for charts
  const expensesByCategory = useMemo(() => {
    if (expenses.length === 0) return [];

    const grouped = expenses.reduce((acc, tx) => {
      const category = tx.category || 'Lainnya';
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0, transactions: [] };
      }
      acc[category].total += tx.price || 0;
      acc[category].count += 1;
      acc[category].transactions.push(tx);
      return acc;
    }, {});

    return Object.entries(grouped).map(([category, data]) => ({
      name: category, // Required by Recharts
      category,
      value: data.total, // Required by Recharts
      total: data.total,
      count: data.count,
      transactions: data.transactions,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
    })).sort((a, b) => b.total - a.total);
  }, [expenses, totalExpenses]);

  // Monthly trend data (last 6 months) with proper validation
  const monthlyTrendData = useMemo(() => {
    if (!Array.isArray(transactions)) return [];

    const months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const month = targetDate.getMonth();
      const year = targetDate.getFullYear();
      
      // Don't include future months
      if (targetDate > today) continue;
      
      const monthTransactions = transactions.filter(tx => {
        if (!tx || typeof tx !== 'object') return false;
        const txDate = parseTransactionDate(tx.date);
        if (!txDate) return false;
        return txDate.getMonth() === month && txDate.getFullYear() === year;
      });

      const monthExpenses = monthTransactions
        .filter(tx => tx.category !== 'income' && typeof tx.price === 'number')
        .reduce((sum, tx) => sum + tx.price, 0);
      
      const monthIncome = monthTransactions
        .filter(tx => tx.category === 'income' && typeof tx.price === 'number')
        .reduce((sum, tx) => sum + tx.price, 0);

      months.push({
        month: getMonthName(month).slice(0, 3),
        expenses: monthExpenses,
        income: monthIncome,
        net: monthIncome - monthExpenses,
        fullMonth: getMonthName(month),
        year: year
      });
    }
    return months;
  }, [transactions, currentMonth, currentYear]);

  // Improved prediction calculations
  const predictions = useMemo(() => {
    if (monthlyTrendData.length < 2) return null;

    const recentExpenses = monthlyTrendData
      .filter(m => m.expenses > 0)
      .slice(-3)
      .map(m => m.expenses);
    
    if (recentExpenses.length === 0) return null;

    const avgExpenses = recentExpenses.reduce((sum, exp) => sum + exp, 0) / recentExpenses.length;
    
    // Calculate trend using linear regression for better accuracy
    let trend = 0;
    if (recentExpenses.length > 1) {
      const n = recentExpenses.length;
      const sumX = (n * (n + 1)) / 2; // Sum of 1,2,3...n
      const sumY = recentExpenses.reduce((sum, val) => sum + val, 0);
      const sumXY = recentExpenses.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
      const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6; // Sum of squares
      
      trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    const nextMonthPrediction = Math.max(0, avgExpenses + trend);
    
    // Current month projection
    const today = new Date();
    const currentDayOfMonth = today.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const remainingDays = Math.max(0, daysInMonth - currentDayOfMonth);
    
    const dailyAverage = currentDayOfMonth > 0 ? totalExpenses / currentDayOfMonth : 0;
    const projectedMonthEnd = totalExpenses + (dailyAverage * remainingDays);

    return {
      nextMonth: nextMonthPrediction,
      currentMonthProjection: projectedMonthEnd,
      dailyAverage,
      trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable',
      trendPercentage: avgExpenses > 0 ? Math.abs(trend / avgExpenses) * 100 : 0
    };
  }, [monthlyTrendData, totalExpenses, currentMonth, currentYear]);

  // Improved smart insights with better logic
  const insights = useMemo(() => {
    const insights = [];

    if (expensesByCategory.length === 0) return insights;

    // Spending pattern insight
    const topCategory = expensesByCategory[0];
    if (topCategory.percentage > 50) {
      insights.push({
        type: 'warning',
        title: 'Pengeluaran Sangat Tidak Seimbang',
        message: `${topCategory.percentage.toFixed(0)}% dari pengeluaran untuk ${topCategory.category}. Ini terlalu tinggi!`,
        icon: AlertTriangle
      });
    } else if (topCategory.percentage > 35) {
      insights.push({
        type: 'warning',
        title: 'Pengeluaran Kurang Seimbang',
        message: `${topCategory.percentage.toFixed(0)}% dari pengeluaran untuk ${topCategory.category}. Pertimbangkan untuk menguranginya.`,
        icon: AlertTriangle
      });
    } else if (topCategory.percentage < 30) {
      insights.push({
        type: 'success',
        title: 'Pengeluaran Seimbang',
        message: `Pengeluaran terdistribusi baik. ${topCategory.category} hanya ${topCategory.percentage.toFixed(0)}% dari total.`,
        icon: CheckCircle
      });
    }

    // Income vs expenses insight
    if (totalIncome > 0) {
      const savingRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
      if (savingRate > 30) {
        insights.push({
          type: 'success',
          title: 'Tingkat Tabungan Excellent',
          message: `Anda menabung ${savingRate.toFixed(0)}% dari pendapatan. Luar biasa!`,
          icon: TrendingUp
        });
      } else if (savingRate > 20) {
        insights.push({
          type: 'success',
          title: 'Tingkat Tabungan Baik',
          message: `Anda menabung ${savingRate.toFixed(0)}% dari pendapatan bulan ini.`,
          icon: TrendingUp
        });
      } else if (savingRate > 0) {
        insights.push({
          type: 'warning',
          title: 'Tingkat Tabungan Rendah',
          message: `Hanya ${savingRate.toFixed(0)}% yang ditabung. Target ideal 20-30%.`,
          icon: TrendingDown
        });
      } else {
        insights.push({
          type: 'warning',
          title: 'Pengeluaran Melebihi Pemasukan',
          message: `Pengeluaran ${Math.abs(savingRate).toFixed(0)}% lebih besar dari pemasukan.`,
          icon: AlertTriangle
        });
      }
    }

    // Transaction frequency insight
    if (expenses.length > 0) {
      const avgTransactionValue = totalExpenses / expenses.length;
      if (avgTransactionValue > 200000) {
        insights.push({
          type: 'info',
          title: 'Transaksi Bernilai Tinggi',
          message: `Rata-rata transaksi Rp ${avgTransactionValue.toLocaleString('id-ID')}. Pertimbangkan alternatif lebih hemat.`,
          icon: Activity
        });
      } else if (avgTransactionValue < 20000 && expenses.length > 20) {
        insights.push({
          type: 'info',
          title: 'Banyak Transaksi Kecil',
          message: `${expenses.length} transaksi dengan rata-rata Rp ${avgTransactionValue.toLocaleString('id-ID')}. Coba batasi pengeluaran kecil.`,
          icon: Activity
        });
      }
    }

    return insights;
  }, [expensesByCategory, totalIncome, totalExpenses, expenses.length]);

  // Navigation handlers with proper date validation
  const navigateMonth = (direction) => {
    const today = new Date();
    const maxYear = today.getFullYear();
    const maxMonth = today.getMonth();
    
    if (direction === 'next') {
      // Don't allow navigation to future months
      if (currentYear > maxYear || (currentYear === maxYear && currentMonth >= maxMonth)) {
        return;
      }
      
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      // Don't allow navigation too far back (e.g., more than 2 years)
      const minYear = maxYear - 2;
      if (currentYear < minYear || (currentYear === minYear && currentMonth <= 0)) {
        return;
      }
      
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {formatter ? formatter(entry.value, entry.name) : `${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render expense tab
  const renderExpenseTab = () => (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Overview Pengeluaran</h3>
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">Total Pengeluaran</p>
          <p className="text-3xl font-bold text-red-600 mb-6">
            Rp {totalExpenses.toLocaleString('id-ID')}
          </p>
          
          {/* Fixed Pie Chart with proper container */}
          {expensesByCategory.length > 0 ? (
            <div className="relative h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={categoryConfig[entry.category]?.color || '#6b7280'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<CustomTooltip formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Jumlah']} />}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              {/* Center text overlay - now properly positioned */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">
                    {expensesByCategory.length}
                  </p>
                  <p className="text-xs text-gray-500">Kategori</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <PieChart size={48} className="mx-auto mb-2" />
                <p>Belum ada data pengeluaran</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
          <div className="flex items-center mb-4">
            <Sparkles className="text-amber-600 mr-2" size={20} />
            <h3 className="font-semibold text-gray-900">Analisis Cerdas</h3>
          </div>
          <div className="space-y-3">
            {insights.slice(0, 2).map((insight, index) => {
              const Icon = insight.icon;
              const bgColor = insight.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                             insight.type === 'success' ? 'bg-emerald-100 text-emerald-800' :
                             'bg-blue-100 text-blue-800';
              
              return (
                <div key={index} className={`p-3 rounded-xl ${bgColor}`}>
                  <div className="flex items-start space-x-3">
                    <Icon size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs mt-1 opacity-90">{insight.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Breakdown Kategori</h3>
        <div className="space-y-4">
          {expensesByCategory.length > 0 ? (
            expensesByCategory.map((category) => {
              const config = categoryConfig[category.category];
              const Icon = config?.icon || FileText;
              return (
                <div key={category.category} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl ${config?.bgColor || 'bg-gray-500'} flex items-center justify-center`}>
                      <Icon className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{category.category}</p>
                      <p className="text-xs text-gray-500">{category.count} transaksi</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      Rp {category.total.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {category.percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <BarChart3 size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 text-sm">Belum ada pengeluaran bulan ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Tren Pengeluaran</h3>
        {monthlyTrendData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  stroke="#64748b" 
                  fontSize={12} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pengeluaran']} />}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Activity size={48} className="mx-auto mb-2" />
              <p>Belum ada data tren</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render income tab
  const renderIncomeTab = () => (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Overview Pemasukan</h3>
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-2">Total Pemasukan</p>
          <p className="text-3xl font-bold text-emerald-600 mb-6">
            Rp {totalIncome.toLocaleString('id-ID')}
          </p>
          
          {/* Income visualization */}
          {monthlyTrendData.length > 0 ? (
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    content={<CustomTooltip formatter={(value) => [`Rp ${value.toLocaleString('id-ID')}`, 'Pemasukan']} />}
                  />
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#10b981" 
                    fill="url(#colorIncome)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp size={48} className="mx-auto mb-2" />
                <p>Belum ada data pemasukan</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Income Analysis */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
        <div className="flex items-center mb-4">
          <TrendingUp className="text-emerald-600 mr-2" size={20} />
          <h3 className="font-semibold text-gray-900">Analisis Pemasukan</h3>
        </div>
        <div className="space-y-3">
          <div className="bg-white/70 p-4 rounded-xl">
            <p className="text-sm text-emerald-800">
              {totalIncome > totalExpenses 
                ? `Selamat! Pemasukan Anda ${(((totalIncome - totalExpenses) / Math.max(totalExpenses, 1)) * 100).toFixed(0)}% lebih besar dari pengeluaran.`
                : totalIncome > 0 
                  ? `Pemasukan ${((totalIncome / Math.max(totalExpenses, 1)) * 100).toFixed(0)}% dari pengeluaran. Mari tingkatkan pemasukan!`
                  : 'Belum ada pemasukan bulan ini. Saatnya mencari sumber pendapatan!'
              }
            </p>
          </div>
          {totalIncome > 0 && (
            <div className="bg-white/70 p-4 rounded-xl">
              <p className="text-sm text-emerald-800">
                Rata-rata pemasukan harian: Rp {(totalIncome / new Date().getDate()).toLocaleString('id-ID')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Income vs Expenses Comparison */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Pemasukan vs Pengeluaran</h3>
        {monthlyTrendData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={(value, name) => [
                    `Rp ${value.toLocaleString('id-ID')}`, 
                    name === 'income' ? 'Pemasukan' : 'Pengeluaran'
                  ]} />}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto mb-2" />
              <p>Belum ada data perbandingan</p>
            </div>
          </div>
        )}
      </div>

      {/* Income Sources */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">Sumber Pemasukan</h3>
        <div className="space-y-3">
          {income.length > 0 ? (
            income.map((tx) => (
              <div key={tx.id || Math.random()} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <Wallet className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tx.label || 'Pemasukan'}</p>
                    <p className="text-xs text-gray-500">
                      {tx.date ? new Date(tx.date).toLocaleDateString('id-ID') : 'Tanggal tidak valid'}
                      {tx.time && ` • ${tx.time}`}
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-emerald-600">
                  +Rp {(tx.price || 0).toLocaleString('id-ID')}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Wallet size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 text-sm">Belum ada pemasukan bulan ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render prediction tab
  const renderPredictionTab = () => (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="text-center mb-6">
          <p className="text-gray-500 text-sm mb-2">Saldo Saat Ini</p>
          <p className="text-4xl font-bold text-gray-900 mb-4">
            Rp {balance.toLocaleString('id-ID')}
          </p>
          
          {/* Simplified balance indicator */}
          <div className="h-32 relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-100 to-indigo-100 mb-4">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${balance > totalExpenses ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {balance > totalExpenses ? 'Kondisi Baik' : 'Perlu Perhatian'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Predictions Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Prediksi Kategori</h4>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Estimasi</span>
          </div>
          
          <div className="space-y-4">
            {expensesByCategory.slice(0, 4).map((category) => {
              const config = categoryConfig[category.category];
              const Icon = config?.icon || FileText;
              const prediction = predictions ? (category.total / totalExpenses) * predictions.nextMonth : category.total;
              
              // Simple trend calculation based on current vs average
              const avgMonthlyExpense = monthlyTrendData.length > 0 
                ? monthlyTrendData.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrendData.length
                : category.total;
              
              const currentCategoryAvg = avgMonthlyExpense > 0 ? (category.total / totalExpenses) * avgMonthlyExpense : 0;
              const trend = category.total > currentCategoryAvg ? 'up' : 'down';
              const trendValue = currentCategoryAvg > 0 ? Math.abs(((category.total - currentCategoryAvg) / currentCategoryAvg) * 100) : 0;

              return (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${config?.bgColor || 'bg-gray-500'} flex items-center justify-center`}>
                      <Icon className="text-white" size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {category.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">
                      Rp {Math.round(prediction).toLocaleString('id-ID')}
                    </span>
                    <div className={`flex items-center ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                      {trend === 'up' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )}
                      <span className="text-xs ml-1">{trendValue.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">Analisis Prediktif</h4>
          
          <div className="space-y-4">
            {predictions ? (
              <>
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">Prediksi Bulan Depan</span>
                  </div>
                  <p className="text-xs text-green-700">
                    Estimasi pengeluaran: Rp {Math.round(predictions.nextMonth).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Proyeksi Bulan Ini</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Rata-rata harian: Rp {Math.round(predictions.dailyAverage).toLocaleString('id-ID')}.
                    Proyeksi akhir bulan: Rp {Math.round(predictions.currentMonthProjection).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp size={16} className="text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">Tren Pengeluaran</span>
                  </div>
                  <p className="text-xs text-amber-700">
                    Tren: {predictions.trend === 'increasing' ? 'Meningkat' : predictions.trend === 'decreasing' ? 'Menurun' : 'Stabil'} 
                    ({predictions.trendPercentage.toFixed(1)}%)
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Target size={48} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500 text-sm">Data belum cukup untuk prediksi</p>
                <p className="text-xs text-gray-400 mt-1">Minimal perlu 2 bulan data</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {predictions && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">Rekomendasi</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
              <h5 className="font-medium text-blue-900 mb-2">Budget Bulan Depan</h5>
              <p className="text-sm text-blue-700">
                Berdasarkan tren, siapkan budget Rp {Math.round(predictions.nextMonth * 1.1).toLocaleString('id-ID')} 
                (10% buffer) untuk bulan depan.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
              <h5 className="font-medium text-green-900 mb-2">Target Penghematan</h5>
              <p className="text-sm text-green-700">
                Jika mengurangi 15% pengeluaran, Anda bisa hemat 
                Rp {Math.round(predictions.nextMonth * 0.15).toLocaleString('id-ID')} bulan depan.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Main render
  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigateMonth('prev')}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          disabled={currentYear <= new Date().getFullYear() - 2}
        >
          <ChevronLeft size={20} className={currentYear <= new Date().getFullYear() - 2 ? 'text-gray-300' : 'text-gray-600'} />
        </button>
        <h2 className="font-semibold text-lg text-gray-900">
          {getMonthName(currentMonth)} {currentYear}
        </h2>
        <button 
          onClick={() => navigateMonth('next')}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          disabled={currentYear >= new Date().getFullYear() && currentMonth >= new Date().getMonth()}
        >
          <ChevronRight size={20} className={
            (currentYear >= new Date().getFullYear() && currentMonth >= new Date().getMonth()) 
              ? 'text-gray-300' 
              : 'text-gray-600'
          } />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2">
        {[
          { key: 'pengeluaran', label: 'Pengeluaran', color: 'red' },
          { key: 'pemasukan', label: 'Pemasukan', color: 'emerald' },
          { key: 'prediksi', label: 'Prediksi', color: 'blue' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.key 
                ? `bg-${tab.color}-500 text-white` 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'pengeluaran' && renderExpenseTab()}
      {activeTab === 'pemasukan' && renderIncomeTab()}
      {activeTab === 'prediksi' && renderPredictionTab()}
    </div>
  );
};

export default TransactionInsights;