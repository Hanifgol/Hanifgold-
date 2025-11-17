import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, gradient }) => {
  return (
    <div className="bg-white rounded-xl border border-medium-gray shadow-md overflow-hidden transform transition-transform hover:scale-105 hover:shadow-lg">
      <div className={`p-5 flex justify-between items-center text-white ${gradient}`}>
        <p className="font-bold tracking-wider">{title}</p>
        {icon}
      </div>
      <div className="p-6">
        <p className="text-3xl font-bold text-secondary">{value}</p>
      </div>
    </div>
  );
};

export default MetricCard;