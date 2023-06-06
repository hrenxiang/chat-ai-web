import React from 'react';

const TypingAnimation = () => {
    return (
        <div className="flex justify-center items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 animate-pulse delay-75"></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 animate-pulse delay-150"></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 animate-pulse delay-225"></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 animate-pulse delay-300"></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 animate-pulse delay-375"></div>
        </div>
    );
};

export default TypingAnimation;