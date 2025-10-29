import { jsx as _jsx } from "react/jsx-runtime";
import { usePrivacy } from '../contexts/PrivacyContext';
export function PrivacyNumber({ value, className = '', children }) {
    const { hideNumbers } = usePrivacy();
    if (hideNumbers) {
        return _jsx("span", { className: className, children: children ? '••••••' : '••••••' });
    }
    return _jsx("span", { className: className, children: children || value });
}
