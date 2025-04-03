import React from 'react';

export const Footer = () => {
  return (
    <footer className="mt-8 py-4 bg-card">
      <div className="container mx-auto px-4">
        <p className="text-center text-gray-600">
          © {new Date().getFullYear()} VetNeed. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

