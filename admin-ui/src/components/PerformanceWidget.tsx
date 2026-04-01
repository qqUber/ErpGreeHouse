import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import { StatCard } from './ui/StatCard';

interface PerformanceData {
  date: string;
  transactions: number;
  revenue: number;
  points_earned: number;
  points_redeemed: number;
  active_customers: number;
  conversion_rate: number;
}

interface PerformanceWidgetProps {
  data: PerformanceData[];
}

export function PerformanceWidget({ data }: PerformanceWidgetProps) {
  const { t } = useTranslation();

  // NaN guards: ensure all numeric values are valid
  const safeData = (data || []).map((d) => ({
    ...d,
    transactions: Number.isFinite(d.transactions) ? d.transactions : 0,
    revenue: Number.isFinite(d.revenue) ? d.revenue : 0,
    points_earned: Number.isFinite(d.points_earned) ? d.points_earned : 0,
    points_redeemed: Number.isFinite(d.points_redeemed) ? d.points_redeemed : 0,
  }));

  const getPerformanceChartOption = () => {
    if (!safeData || safeData.length === 0) {
      return {
        title: {
          text: 'Нет данных для отображения',
          left: 'center',
          top: 'center',
        },
        series: [
          {
            type: 'pie',
            data: [],
          },
        ],
      };
    }

    const dates = safeData.map((d) => d.date);
    const transactions = safeData.map((d) => d.transactions);
    const revenue = safeData.map((d) => d.revenue);
    const pointsEarned = safeData.map((d) => d.points_earned);
    const pointsRedeemed = safeData.map((d) => d.points_redeemed);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151' },
      },
      legend: {
        data: [
          t('analytics.transactions'),
          t('analytics.revenue'),
          t('analytics.pointsEarned'),
          t('analytics.pointsRedeemed'),
        ],
        bottom: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: t('analytics.quantity'),
          position: 'left',
        },
        {
          type: 'value',
          name: t('analytics.revenue') + ' (₽)',
          position: 'right',
        },
        {
          type: 'value',
          name: t('analytics.points'),
          position: 'right',
          offset: 80,
        },
      ],
      series: [
        {
          name: t('analytics.transactions'),
          type: 'line',
          smooth: true,
          data: transactions,
          itemStyle: { color: '#3b82f6' },
          yAxisIndex: 0,
        },
        {
          name: t('analytics.revenue'),
          type: 'line',
          smooth: true,
          data: revenue,
          itemStyle: { color: '#10b981' },
          yAxisIndex: 1,
        },
        {
          name: t('analytics.pointsEarned'),
          type: 'line',
          smooth: true,
          data: pointsEarned,
          itemStyle: { color: '#f59e0b' },
          yAxisIndex: 2,
        },
        {
          name: t('analytics.pointsRedeemed'),
          type: 'line',
          smooth: true,
          data: pointsRedeemed,
          itemStyle: { color: '#ef4444' },
          yAxisIndex: 2,
        },
      ],
    };
  };

  return (
    <div
      className="card cardFull"
      data-testid="admin_widget_performance_en"
      role="region"
      aria-label="Performance Analytics"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="font-bold text-lg flex items-center gap-2">
          <span>⚡</span>
          {t('dashboardAdmin.performance')}
        </div>
      </div>

      <div className="h-80">
        <ReactECharts
          option={getPerformanceChartOption()}
          style={{ height: '100%' }}
          opts={{ renderer: 'svg' }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {(() => {
          const lastData = safeData.length > 0 ? safeData[safeData.length - 1] : null;

          return (
            <>
              <StatCard
                variant="primary"
                value={
                  lastData && Number.isFinite(lastData.transactions) ? lastData.transactions : 0
                }
                label={t('dashboardAdmin.transactions')}
              />

              <StatCard
                variant="success"
                value={
                  lastData && Number.isFinite(lastData.revenue)
                    ? `${new Intl.NumberFormat('ru-RU').format(lastData.revenue)} ₽`
                    : '0 ₽'
                }
                label={t('dashboardAdmin.revenue')}
              />

              <StatCard
                variant="info"
                value={
                  lastData && Number.isFinite(lastData.points_earned) ? lastData.points_earned : 0
                }
                label={t('dashboardAdmin.pointsEarned')}
              />

              <StatCard
                variant="warning"
                value={
                  lastData && Number.isFinite(lastData.points_redeemed)
                    ? lastData.points_redeemed
                    : 0
                }
                label={t('dashboardAdmin.pointsRedeemed')}
              />
            </>
          );
        })()}
      </div>
    </div>
  );
}
