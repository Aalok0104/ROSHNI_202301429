import React from 'react';

const LoadingPlaceholder: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-full min-h-[50vh] w-full">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Loading...</p>
            </div>
        </div>
    );
};

export default LoadingPlaceholder;
