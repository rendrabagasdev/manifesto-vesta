"use client";

import { useEffect, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/docs/openapi.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load OpenAPI spec");
        return res.json();
      })
      .then((data) => setSpec(data))
      .catch((err) => {
        console.error("Error loading OpenAPI spec:", err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Error Loading API Documentation
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-green-600 text-white py-6 px-4 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Vesta Marketplace API</h1>
          <p className="text-green-100">
            Dokumentasi lengkap API untuk integrasi dengan platform cascade
            freshness
          </p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto">
        <SwaggerUI spec={spec} />
      </div>
    </div>
  );
}
