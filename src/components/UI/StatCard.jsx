import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({
    icon: Icon,
    iconColor = 'purple',
    value,
    label,
    trend,
    trendValue,
    prefix = '',
    suffix = ''
}) => {
    return (
        <div className="stat-card animate-fadeIn">
            <div className="stat-card-header">
                <div className={`stat-card-icon ${iconColor}`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <div className={`stat-card-trend ${trend}`}>
                        {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{trendValue}</span>
                    </div>
                )}
            </div>
            <div className="stat-card-value">
                {prefix}{typeof value === 'number' ? value.toLocaleString('fr-FR') : value}{suffix}
            </div>
            <div className="stat-card-label">{label}</div>
        </div>
    );
};

export default StatCard;
