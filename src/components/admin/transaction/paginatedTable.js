"use client";

import React from "react";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

// Register required elements
ChartJS.register(ArcElement, Tooltip, Legend);

const RevenuePieChart = ({ transactions }) => {
  const categories = {};
  transactions?.forEach((txn) =>
    txn.items.forEach((item) => {
      categories[item.categoryId] = (categories[item.categoryId] || 0) + item.sellingPrice * item.quantitySold;
    })
  );

  const data = {
    labels: Object.keys(categories),
    datasets: [
      {
        data: Object.values(categories),
        backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div className="w-full">
      <Pie data={data} />
    </div>
  );
};

export default RevenuePieChart;
