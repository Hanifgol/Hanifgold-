import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, gradient }) => {
  return (
    <div className={`relative bg-white/60 dark:bg-white/5 backdrop-blur-md p-8 rounded-[2rem] shadow-lg border border-white/40 dark:border-white/5 overflow-hidden group transition-all duration-500 hover:transform hover:-translate-y-2 hover:shadow-2xl`}>
      {/* Background Gradient Overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40 group-hover:opacity-60 transition-opacity duration-500`}></div>
      
      <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start mb-4">
               <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-md text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform duration-500 border border-gray-100 dark:border-gray-700">
                  {icon}
              </div>
          </div>
          <div>
              <h3 className="text-4xl font-black text-brand-dark dark:text-white tracking-tighter mb-1">{value}</h3>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest opacity-80">{title}</p>
          </div>
      </div>
      
      {/* Decorative blurred circle */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-3xl pointer-events-none group-hover:bg-white/30 transition-colors duration-500"></div>
    </div>
  );
};

export default MetricCard;