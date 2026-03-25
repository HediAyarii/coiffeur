import React, { createContext, useContext, useState, useEffect } from 'react';

const DateFilterContext = createContext(null);

export const DateFilterProvider = ({ children }) => {
    // Initialize with current month's first and last day
    const [startDate, setStartDate] = useState(() => {
        const saved = localStorage.getItem('coiffeur_filter_startDate');
        if (saved) return saved;
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    });
    
    const [endDate, setEndDate] = useState(() => {
        const saved = localStorage.getItem('coiffeur_filter_endDate');
        if (saved) return saved;
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    });

    // Save to localStorage when dates change
    useEffect(() => {
        localStorage.setItem('coiffeur_filter_startDate', startDate);
    }, [startDate]);

    useEffect(() => {
        localStorage.setItem('coiffeur_filter_endDate', endDate);
    }, [endDate]);

    // Helper to get month in YYYY-MM format (from startDate)
    const getMonth = () => startDate.slice(0, 7);
    
    // Helper to get year and month numbers
    const getYearMonth = () => {
        const [year, month] = startDate.split('-').map(Number);
        return { year, month };
    };

    // Set to today
    const setToday = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
    };

    // Set to current week
    const setThisWeek = () => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        setStartDate(monday.toISOString().split('T')[0]);
        setEndDate(sunday.toISOString().split('T')[0]);
    };

    // Set to current month
    const setThisMonth = () => {
        const now = new Date();
        const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const lastDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        setStartDate(firstDay);
        setEndDate(lastDayStr);
    };

    // Navigate to previous period (based on current range)
    const previousPeriod = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        start.setDate(start.getDate() - diffDays);
        end.setDate(end.getDate() - diffDays);
        
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    // Navigate to next period
    const nextPeriod = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        start.setDate(start.getDate() + diffDays);
        end.setDate(end.getDate() + diffDays);
        
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    // Format date range for display
    const formatDateRange = () => {
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        const startFormatted = new Date(startDate).toLocaleDateString('fr-FR', options);
        const endFormatted = new Date(endDate).toLocaleDateString('fr-FR', options);
        
        if (startDate === endDate) {
            return startFormatted;
        }
        return `${startFormatted} - ${endFormatted}`;
    };

    return (
        <DateFilterContext.Provider value={{
            startDate,
            endDate,
            setStartDate,
            setEndDate,
            getMonth,
            getYearMonth,
            setToday,
            setThisWeek,
            setThisMonth,
            previousPeriod,
            nextPeriod,
            formatDateRange
        }}>
            {children}
        </DateFilterContext.Provider>
    );
};

export const useDateFilter = () => {
    const context = useContext(DateFilterContext);
    if (!context) {
        throw new Error('useDateFilter must be used within a DateFilterProvider');
    }
    return context;
};

export default DateFilterContext;
