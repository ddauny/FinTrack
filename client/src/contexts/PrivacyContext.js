import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
const PrivacyContext = createContext(undefined);
export function PrivacyProvider({ children }) {
    const [hideNumbers, setHideNumbers] = useState(false);
    const toggleNumbers = () => {
        setHideNumbers(prev => !prev);
    };
    return (_jsx(PrivacyContext.Provider, { value: { hideNumbers, toggleNumbers }, children: children }));
}
export function usePrivacy() {
    const context = useContext(PrivacyContext);
    if (context === undefined) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
}
