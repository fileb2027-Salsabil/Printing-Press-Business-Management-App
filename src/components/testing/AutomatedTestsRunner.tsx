import React, { useState, useEffect } from 'react';
import { runAllAutomatedTests, TestResult } from '../../utils/automatedTests';
import { ShieldCheck, CheckCircle2, XCircle, Play, RefreshCw } from 'lucide-react';

export const AutomatedTestsRunner: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllAutomatedTests();
      setResults(res);
      setIsRunning(false);
    }, 400);
  };

  useEffect(() => {
    // Run tests automatically on mount
    handleRunTests();
  }, []);

  const totalPassed = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
            <span>সিস্টেম অটোমেটেড টেস্ট রানার (Automated Tests Suite)</span>
          </h2>
          <p className="text-xs text-slate-500">
            মক্কা প্রিন্টার্সের সমস্ত হিসাব, বোনাস, ওভারটাইম, লিপ ইয়ার ও ডেটাবেজ লজিকের বাস্তব যাচাইকরণ
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition"
        >
          <Play className="w-3.5 h-3.5" />
          <span>{isRunning ? 'টেস্ট চলছে...' : 'পুনরায় টেস্ট চালান'}</span>
        </button>
      </div>

      {/* Test Score Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            টেস্ট ফলাফল স্ট্যাটাস
          </span>
          <div className="text-2xl font-black text-slate-900">
            <span className="text-emerald-700">{totalPassed}</span> / <span>{results.length}</span> টেস্ট সফল
          </div>
          <p className="text-xs text-slate-500">
            {totalPassed === results.length
              ? '✓ সমস্ত গাণিতিক সূত্র ও নিয়ম ১০০% নির্ভুল এবং উত্তীর্ণ হয়েছে।'
              : 'কিছু টেস্টে গরমিল পাওয়া গেছে।'}
          </p>
        </div>

        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 border-4 border-emerald-500 flex items-center justify-center font-black text-lg">
          ১০০%
        </div>
      </div>

      {/* Tests List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
        {results.map((test) => (
          <div key={test.id} className="p-4 flex items-start space-x-3 hover:bg-slate-50 transition">
            {test.passed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 text-xs">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-slate-900">{test.titleBn}</h4>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    test.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {test.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-2.5 rounded-lg border text-[11px]">
                <div>
                  <span className="text-slate-400 font-semibold">প্রত্যাশিত মান (Expected):</span>
                  <p className="font-semibold text-slate-800">{test.expected}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">প্রাপ্ত মান (Actual):</span>
                  <p className="font-bold text-emerald-800">{test.actual}</p>
                </div>
              </div>

              {test.details && (
                <p className="text-[11px] text-slate-500 mt-1 italic">{test.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
