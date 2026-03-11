import ReactECharts from 'echarts-for-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

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

  const getPerformanceChartOption = () => {
    if (!data || data.length === 0) {
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

    const dates = data.map((d) => d.date);
    const transactions = data.map((d) => d.transactions);
    const revenue = data.map((d) => d.revenue);
    const pointsEarned = data.map((d) => d.points_earned);
    const pointsRedeemed = data.map((d) => d.points_redeemed);

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        textStyle: { color: '#374151' },
      },
      legend: {
        data: ['Транзакции', 'Выручка', 'Начислено баллов', 'Использовано баллов'],
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
          name: 'Количество',
          position: 'left',
        },
        {
          type: 'value',
          name: 'Выручка (₽)',
          position: 'right',
        },
        {
          type: 'value',
          name: 'Баллы',
          position: 'right',
          offset: 80,
        },
      ],
      series: [
        {
          name: 'Транзакции',
          type: 'line',
          smooth: true,
          data: transactions,
          itemStyle: { color: '#3b82f6' },
          yAxisIndex: 0,
        },
        {
          name: 'Выручка',
          type: 'line',
          smooth: true,
          data: revenue,
          itemStyle: { color: '#10b981' },
          yAxisIndex: 1,
        },
        {
          name: 'Начислено баллов',
          type: 'line',
          smooth: true,
          data: pointsEarned,
          itemStyle: { color: '#8b5cf6' },
          yAxisIndex: 2,
        },
        {
          name: 'Использовано баллов',
          type: 'line',
          smooth: true,
          data: pointsRedeemed,
          itemStyle: { color: '#f59e0b' },
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
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {data.length > 0 ? data[data.length - 1]?.transactions : 0}
          </div>
          <div className="text-sm text-muted">{t('dashboardAdmin.transactions')}</div>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {data.length > 0
              ? new Intl.NumberFormat('ru-RU').format(data[data.length - 1]?.revenue || 0)
              : '0'}{' '}
            ₽
          </div>
          <div className="text-sm text-muted">{t('dashboardAdmin.revenue')}</div>
        </div>

        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {data.length > 0 ? data[data.length - 1]?.points_earned : 0}
          </div>
          <div className="text-sm text-muted">{t('dashboardAdmin.pointsEarned')}</div>
        </div>

        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {data.length > 0 ? data[data.length - 1]?.points_redeemed : 0}
          </div>
          <div className="text-sm text-muted">{t('dashboardAdmin.pointsRedeemed')}</div>
        </div>
      </div>
    </div>
  );
}
