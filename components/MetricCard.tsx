import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, gradient }) => {
  return (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-soft hover:shadow-lg transition-all duration-300 border border-border-color dark:border-border-dark flex flex-col justify-between h-full relative overflow-hidden group">
      <div className="flex justify-between items-start">
          <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{title}</p>
              <h3 className="text-2xl font-bold text-brand-dark dark:text-white tracking-tight group-hover:text-gold-dark transition-colors">{value}</h3>
          </div>
          <div className={`p-3 rounded-xl ${gradient} dark:bg-opacity-10 transition-transform group-hover:scale-110`}>
              {icon}
          </div>
      </div>
      {/* Decorative circle */}
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full ${gradient} opacity-10 dark:opacity-5 pointer-events-none`}></div>
    </div>
  );
};

export default MetricCard;