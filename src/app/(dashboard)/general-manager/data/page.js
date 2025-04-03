"use client"
import { useEffect, useState } from 'react';

export default function Home() {
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        console.log('API Response:', data); // Debugging
        if (Array.isArray(data)) {
          setBranches(data);
        } else {
          console.error('Unexpected API response:', data);
        }
      })
      .catch(err => console.error('Fetch error:', err));
  }, []);

  return (
    <div>
      <h1>Branches</h1>
      {Array.isArray(branches) ? (
        <ul>
          {branches.map(branch => (
            <li key={branch.id}>
              {branch.branchName} - {branch.location}
            </li>
          ))}
        </ul>
      ) : (
        <p>No branches available.</p>
      )}
    </div>
  );
}