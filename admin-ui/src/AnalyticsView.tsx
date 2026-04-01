import ReactECharts from 'echarts-for-react';
import { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Api,
  ChartData,
  CustomerSegmentation,
  DashboardOverview,
  LoyaltyDetailedReport,
  LoyaltyReportOverview,
} from './api';

// Factory function to create common chart configuration
function createChartBase(
  dates: string[],
  legendData: string[],
  tooltipFormatter: (params: any) => string,
  yAxisConfig: any,
  seriesConfig: any[]
) {
  return {
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#374151' },
      formatter: tooltipFormatter,
    },
    legend: {
      data: legendData,
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category' as const,
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
    },
    yAxis: yAxisConfig,
    series: seriesConfig,
  };
}

export function AnalyticsView() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [salesChart, setSalesChart] = useState<ChartData | null>(null);
  const [customerChart, setCustomerChart] = useState<ChartData | null>(null);
  const [loyaltyChart, setLoyaltyChart] = useState<ChartData | null>(null);
  const [loyaltyOverview, setLoyaltyOverview] = useState<LoyaltyReportOverview | null>(null);
  const [loyaltyDetails, setLoyaltyDetails] = useState<LoyaltyDetailedReport | null>(null);
  const [segmentation, setSegmentation] = useState<CustomerSegmentation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  async function loadAnalyticsData() {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewData,
        salesData,
        customerData,
        loyaltyData,
        loyaltyReport,
        loyaltyDetailed,
        segmentationData,
      ] = await Promise.all([
        Api.dashboardOverview(timeRange),
        Api.salesChart(timeRange),
        Api.customerChart(timeRange),
        Api.loyaltyChart(timeRange),
        Api.loyaltyReportOverview(timeRange),
        Api.loyaltyDetailedReport(timeRange),
        Api.customerSegmentation(),
      ]);
      setOverview(overviewData);
      setSalesChart(salesData);
      setCustomerChart(customerData);
      setLoyaltyChart(loyaltyData);
      setLoyaltyOverview(loyaltyReport);
      setLoyaltyDetails(loyaltyDetailed);
      setSegmentation(segmentationData);
    } catch (e) {
      console.error('Failed to load analytics:', e);
      setError(t('analytics.loadError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(type: string) {
    try {
      setExportError(null);
      let response: Response;
      let filename: string;
      switch (type) {
        case 'loyalty':
          response = await Api.exportLoyaltyReport(timeRange);
          filename = `loyalty_report_${timeRange}.csv`;
          break;
        case 'sales':
          response = await Api.exportSalesReport(timeRange);
          filename = `sales_report_${timeRange}.csv`;
          break;
        case 'customers':
          response = await Api.exportCustomersReport(timeRange);
          filename = `customers_report_${timeRange}.csv`;
          break;
        default:
          throw new Error('Unknown export type');
      }
      const blob = await response.blob();
      const text = await blob.text();
      const bom = '\uFEFF';
      const utf8Blob = new Blob([bom + text], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(utf8Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Export failed:', e);
      setExportError(t('common.error'));
    }
  }

  if (loading && !overview && !salesChart) {
    return (
      <div className="flex items-center justify-center p-8">
        <div style={{ color: 'var(--muted)' }}>{t('analytics.collecting')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          background: 'var(--error-light)',
          border: '1px solid var(--error)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ color: 'var(--error)' }}>{error}</div>
        <button
          onClick={loadAnalyticsData}
          style={{
            marginTop: 8,
            fontSize: 14,
            color: 'var(--error)',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
          data-testid="analytics_retry_button"
        >
          {t('common.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text)' }}>
            {t('analytics.dashboardTitle')}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>{t('analytics.dashboardDesc')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label
            style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', whiteSpace: 'nowrap' }}
          >
            {t('analytics.timeRange')}:
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--border)',
              borderRadius: 6,
              background: 'var(--panel)',
              color: 'var(--text)',
              fontSize: 14,
              minWidth: 160,
            }}
          >
            <option value="24h">{t('analytics.timeFilter.24hours')}</option>
            <option value="7d">{t('analytics.timeFilter.7days')}</option>
            <option value="30d">{t('analytics.timeFilter.30days')}</option>
            <option value="90d">{t('analytics.timeFilter.90days')}</option>
            <option value="1y">{t('analytics.timeFilter.1year')}</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>
            {t('analytics.export')}:
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleExport('loyalty')}
              style={{
                padding: '8px 16px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {t('analytics.exportLoyalty')}
            </button>
            <button
              onClick={() => handleExport('sales')}
              style={{
                padding: '8px 16px',
                background: 'var(--good)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {t('analytics.exportSales')}
            </button>
            <button
              onClick={() => handleExport('customers')}
              style={{
                padding: '8px 16px',
                background: 'var(--info)',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {t('analytics.exportCustomers')}
            </button>
          </div>
        </div>
      </div>

      {exportError ? (
        <div
          style={{
            borderRadius: 8,
            border: '1px solid var(--error)',
            background: 'var(--error-light)',
            padding: 12,
            color: 'var(--error)',
          }}
        >
          {exportError}
        </div>
      ) : null}

      {/* Key Metrics Overview */}
      {overview && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 24,
          }}
        >
          {[
            {
              icon: '👥',
              label: t('analytics.totalCustomers'),
              value: overview.metrics.total_customers,
              color: 'var(--primary)',
            },
            {
              icon: '📈',
              label: t('analytics.newCustomers'),
              value: overview.metrics.new_customers,
              color: 'var(--good)',
            },
            {
              icon: '💰',
              label: t('analytics.revenue'),
              value: `${new Intl.NumberFormat('ru-RU').format(overview.metrics.revenue)} ₽`,
              color: 'rgba(168, 85, 247, 0.8)',
            },
            {
              icon: '🎯',
              label: t('analytics.avgCheck'),
              value: `${new Intl.NumberFormat('ru-RU').format(overview.metrics.avg_check)} ₽`,
              color: 'var(--warn)',
            },
          ].map((metric, i) => (
            <div key={i} className="card dashboard-widget-2026" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: metric.color,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: 'white', fontWeight: 'bold' }}>{metric.icon}</span>
                </div>
                <div style={{ marginLeft: 16 }}>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>
                    {metric.label}
                  </p>
                  <p style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text)' }}>
                    {metric.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 24,
        }}
      >
        {salesChart && (
          <div className="card dashboard-widget-2026" style={{ padding: 24 }}>
            <h3
              style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)', marginBottom: 16 }}
            >
              {t('analytics.salesDynamics')}
            </h3>
            <ReactECharts
              option={getSalesChartOption(salesChart.data, t)}
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        )}
        {customerChart && (
          <div className="card dashboard-widget-2026" style={{ padding: 24 }}>
            <h3
              style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)', marginBottom: 16 }}
            >
              {t('analytics.customerDynamics')}
            </h3>
            <ReactECharts
              option={getCustomersChartOption(customerChart.data, t)}
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        )}
      </div>

      {/* Loyalty Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 24,
        }}
      >
        {loyaltyOverview && (
          <div className="card dashboard-widget-2026" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
              {t('analytics.loyalty')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>
                  {t('analytics.pointsEarned')}
                </p>
                <p style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text)' }}>
                  {loyaltyOverview.metrics.points_earned}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>
                  {t('analytics.pointsRedeemed')}
                </p>
                <p style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text)' }}>
                  {loyaltyOverview.metrics.points_redeemed}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>
                  {t('analytics.redemptionRate')}
                </p>
                <p style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text)' }}>
                  {loyaltyOverview.metrics.redemption_rate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>
                  {t('analytics.avgPointsPerTransaction')}
                </p>
                <p style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text)' }}>
                  {loyaltyOverview.metrics.avg_points_per_transaction.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}
        {loyaltyChart && (
          <div className="card dashboard-widget-2026" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
              {t('analytics.loyaltyByDay')}
            </h3>
            <ReactECharts
              option={getLoyaltyChartOption(loyaltyChart.data, t)}
              style={{ height: '300px' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        )}
      </div>

      {/* Customer Segmentation */}
      {segmentation && (
        <div
          className="card dashboard-widget-2026"
          style={{ padding: 24, maxHeight: 400, overflow: 'auto' }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
            {t('analytics.customerSegmentation')}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: 16,
              minWidth: 600,
            }}
          >
            {Object.entries(segmentation.segments).map(([segment, data]) => (
              <div key={segment} className="card" style={{ padding: 16 }}>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--muted)',
                    textTransform: 'capitalize',
                  }}
                >
                  {getSegmentDisplayName(segment, t)}
                </p>
                <p style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text)', marginTop: 4 }}>
                  {data.count}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  {((data.count / segmentation.total_customers) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loyalty Details Table */}
      {loyaltyDetails && loyaltyDetails.customer_data.length > 0 && (
        <div className="card dashboard-widget-2026" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
            {t('analytics.customerDetails')}
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--neutral-100)' }}>
                  {[
                    t('analytics.customer'),
                    t('analytics.phone'),
                    t('analytics.transactions'),
                    t('analytics.totalAmount'),
                    t('analytics.earned'),
                    t('analytics.redeemed'),
                    t('analytics.lastTransaction'),
                  ].map((h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '12px 24px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'var(--muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loyaltyDetails.customer_data.slice(0, 10).map((customer) => (
                  <tr
                    key={customer.customer_id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                        {customer.full_name}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: 14,
                        color: 'var(--text)',
                      }}
                    >
                      {customer.phone}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: 14,
                        color: 'var(--text)',
                      }}
                    >
                      {customer.transaction_count}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: 14,
                        color: 'var(--text)',
                      }}
                    >
                      {new Intl.NumberFormat('ru-RU').format(customer.total_spent)} ₽
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: 14,
                        color: 'var(--text)',
                      }}
                    >
                      {customer.points_earned}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: 14,
                        color: 'var(--text)',
                      }}
                    >
                      {customer.points_redeemed}
                    </td>
                    <td
                      style={{
                        padding: '16px 24px',
                        whiteSpace: 'nowrap',
                        fontSize: 14,
                        color: 'var(--text)',
                      }}
                    >
                      {new Date(customer.last_transaction).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loyaltyDetails.customer_data.length > 10 && (
            <div style={{ marginTop: 16, fontSize: 14, color: 'var(--muted)' }}>
              {t('analytics.showingRecords', {
                shown: 10,
                total: loyaltyDetails.customer_data.length,
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getSegmentDisplayName(segment: string, t: (key: string) => string): string {
  const displayNames: Record<string, string> = {
    new: t('analytics.segmentNew'),
    active: t('analytics.segmentActive'),
    at_risk: t('analytics.segmentAtRisk'),
    churned: t('analytics.segmentChurned'),
    vip: t('analytics.segmentVip'),
  };
  return displayNames[segment] || segment;
}

function getSalesChartOption(data: ChartData['data'], t: TFunction) {
  const dates = data.map((d) => d.date);
  const revenue = data.map((d) => d.revenue || 0);
  const transactions = data.map((d) => d.transactions || 0);

  return createChartBase(
    dates,
    [t('analytics.revenue'), t('analytics.transactions')],
    (params: any) => {
      const date = params[0]?.axisValue;
      const revenueValue = params.find((p: any) => p.seriesName === t('analytics.revenue'))?.value;
      const transactionsValue = params.find(
        (p: any) => p.seriesName === t('analytics.transactions')
      )?.value;
      return `<b>${date}</b><br/>${t('analytics.revenue')}: ${new Intl.NumberFormat('ru-RU').format(revenueValue)} ₽<br/>${t('analytics.transactions')}: ${transactionsValue}`;
    },
    [
      {
        type: 'value',
        name: t('analytics.revenueCurrency'),
        axisLabel: {
          formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
        },
      },
      {
        type: 'value',
        name: t('analytics.transactions'),
        axisLabel: {
          formatter: (value: number) => `${value}`,
        },
      },
    ],
    [
      {
        name: t('analytics.revenue'),
        type: 'line',
        smooth: true,
        data: revenue,
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
      },
      {
        name: t('analytics.transactions'),
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: transactions,
        itemStyle: { color: '#10b981' },
      },
    ]
  );
}

function getCustomersChartOption(data: ChartData['data'], t: TFunction) {
  const dates = data.map((d) => d.date);
  const newCustomers = data.map((d) => d.new_customers || 0);
  const activeCustomers = data.map((d) => d.active_customers || 0);

  return createChartBase(
    dates,
    [t('analytics.newCustomers'), t('analytics.activeCustomers')],
    (params: any) => {
      const date = params[0]?.axisValue;
      const newValue = params.find((p: any) => p.seriesName === t('analytics.newCustomers'))?.value;
      const activeValue = params.find(
        (p: any) => p.seriesName === t('analytics.activeCustomers')
      )?.value;
      return `<b>${date}</b><br/>${t('analytics.newCustomers')}: ${newValue}<br/>${t('analytics.activeCustomers')}: ${activeValue}`;
    },
    {
      type: 'value',
      name: t('analytics.customers'),
    },
    [
      {
        name: t('analytics.newCustomers'),
        type: 'bar',
        data: newCustomers,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#6366f1' },
              { offset: 1, color: '#8b5cf6' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: t('analytics.activeCustomers'),
        type: 'line',
        smooth: true,
        data: activeCustomers,
        itemStyle: { color: '#10b981' },
      },
    ]
  );
}

function getLoyaltyChartOption(data: ChartData['data'], t: TFunction) {
  const dates = data.map((d) => d.date);
  const pointsEarned = data.map((d) => d.points_earned || 0);
  const pointsRedeemed = data.map((d) => d.points_redeemed || 0);

  return createChartBase(
    dates,
    [t('analytics.earned'), t('analytics.redeemed')],
    (params: any) => {
      const date = params[0]?.axisValue;
      const earned = params.find((p: any) => p.seriesName === t('analytics.earned'))?.value;
      const redeemed = params.find((p: any) => p.seriesName === t('analytics.redeemed'))?.value;
      return `<b>${date}</b><br/>${t('analytics.earned')}: ${earned} ${t('analytics.points')}<br/>${t('analytics.redeemed')}: ${redeemed} ${t('analytics.points')}`;
    },
    {
      type: 'value',
      name: t('analytics.points'),
    },
    [
      {
        name: t('analytics.earned'),
        type: 'line',
        smooth: true,
        data: pointsEarned,
        itemStyle: { color: '#10b981' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.3)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' },
            ],
          },
        },
      },
      {
        name: t('analytics.redeemed'),
        type: 'line',
        smooth: true,
        data: pointsRedeemed,
        itemStyle: { color: '#f59e0b' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
            ],
          },
        },
      },
    ]
  );
}
