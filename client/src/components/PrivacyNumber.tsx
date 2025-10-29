import React from 'react';
import { usePrivacy } from '../contexts/PrivacyContext';
import type { PrivacyNumberProps } from '../types';

export function PrivacyNumber({ value, className = '', children }: PrivacyNumberProps) {
  const { hideNumbers } = usePrivacy();
  
  if (hideNumbers) {
    return <span className={className}>{children ? '••••••' : '••••••'}</span>;
  }
  
  return <span className={className}>{children || value}</span>;
}