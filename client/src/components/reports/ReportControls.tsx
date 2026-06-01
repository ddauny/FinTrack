import React from 'react';
import DatePicker from 'react-datepicker';
import dayjs from 'dayjs';
import 'react-datepicker/dist/react-datepicker.css';

interface ReportControlsProps {
  isCompareMode: boolean;
  setIsCompareMode: (mode: boolean) => void;
  startDate1: Date;
  setStartDate1: (date: Date) => void;
  endDate1: Date;
  setEndDate1: (date: Date) => void;
  startDate2: Date;
  setStartDate2: (date: Date) => void;
  endDate2: Date;
  setEndDate2: (date: Date) => void;
}

export const ReportControls: React.FC<ReportControlsProps> = ({
  isCompareMode,
  setIsCompareMode,
  startDate1,
  setStartDate1,
  endDate1,
  setEndDate1,
  startDate2,
  setStartDate2,
  endDate2,
  setEndDate2,
}) => {
  return (
    <div className="bg-white dark:bg-[#111111] p-4 rounded-lg border border-slate-200/80 dark:border-[#1f1f1f] flex flex-col md:flex-row items-center gap-4 sticky top-0 z-20">
      
      {/* Primary Period */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500 dark:text-[#888]">Period:</span>
        <div className="flex items-center bg-slate-100 dark:bg-[#101010] rounded-lg p-1 border border-slate-200 dark:border-[#1f1f1f]">
           <DatePicker
              selected={startDate1}
              onChange={(date: Date | null) => date && setStartDate1(date)}
              selectsStart
              startDate={startDate1}
              endDate={endDate1}
              dateFormat="MMM yyyy"
              showMonthYearPicker
              className="w-24 bg-transparent text-sm text-center font-medium text-slate-700 dark:text-[#d8d8d8] focus:outline-none cursor-pointer"
            />
            <span className="text-slate-400 mx-1">→</span>
            <DatePicker
              selected={endDate1}
              onChange={(date: Date | null) => date && setEndDate1(dayjs(date).endOf('month').toDate())}
              selectsEnd
              startDate={startDate1}
              endDate={endDate1}
              minDate={startDate1}
              dateFormat="MMM yyyy"
              showMonthYearPicker
              className="w-24 bg-transparent text-sm text-center font-medium text-slate-700 dark:text-[#d8d8d8] focus:outline-none cursor-pointer"
            />
        </div>
      </div>

      {/* Comparison Toggle */}
      <button
        onClick={() => setIsCompareMode(!isCompareMode)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isCompareMode 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#101010] dark:text-[#888] dark:hover:bg-[#242424] dark:bg-[#1a1a1a]'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10 2a.75.75 0 01.75.75v5.59l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 011.06-1.06l2.72 2.72V2.75A.75.75 0 0110 2z" />
          <path d="M10 18a.75.75 0 01-.75-.75v-5.59l-2.72 2.72a.75.75 0 01-1.06-1.06l4-4a.75.75 0 011.06 0l4 4a.75.75 0 11-1.06 1.06l-2.72-2.72v5.59A.75.75 0 0110 18z" />
        </svg>
        Compare
      </button>

      {/* Secondary Period (Conditional) */}
      {isCompareMode && (
         <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
         <span className="text-sm font-medium text-slate-500 dark:text-[#888]">vs</span>
         <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 rounded-lg p-1 border border-blue-100 dark:border-blue-900/30">
            <DatePicker
               selected={startDate2}
               onChange={(date: Date | null) => date && setStartDate2(date)}
               selectsStart
               startDate={startDate2}
               endDate={endDate2}
               dateFormat="MMM yyyy"
               showMonthYearPicker
               className="w-24 bg-transparent text-sm text-center font-medium text-blue-700 dark:text-blue-300 focus:outline-none cursor-pointer"
             />
             <span className="text-blue-400 mx-1">→</span>
             <DatePicker
               selected={endDate2}
               onChange={(date: Date | null) => date && setEndDate2(dayjs(date).endOf('month').toDate())}
               selectsEnd
               startDate={startDate2}
               endDate={endDate2}
               minDate={startDate2}
               dateFormat="MMM yyyy"
               showMonthYearPicker
               className="w-24 bg-transparent text-sm text-center font-medium text-blue-700 dark:text-blue-300 focus:outline-none cursor-pointer"
             />
         </div>
       </div>
      )}
    </div>
  );
};
