import React from 'react';

export const Footer = () => {
  return (
    <footer className="footer">
      <p>
        LeadPulse Platform &copy; {new Date().getFullYear()} -{' '}
        <a 
          href="https://digitalheroesco.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="footer-credit"
        >
          Built for Digital Heroes Training Task
        </a>
      </p>
    </footer>
  );
};
