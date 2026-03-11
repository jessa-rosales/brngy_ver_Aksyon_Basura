import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  Calendar, 
  BarChart2, 
  ShieldAlert, 
  Check, 
  Info,
  Recycle,
  CalendarDays,
  MapPin,
  Loader2
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService'; 
import { generateSystemReport } from '../utils/pdfReportGenerator';

const ReportPreview = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('Weekly');
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const [previewData, setPreviewData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false); 

  const getBaseDate = () => {
    if (!selectedDate) return new Date();
    const [y, m, d] = selectedDate.split('-');
    return new Date(y, m - 1, d);
  };

  const getPeriodBoundaries = () => {
    const base = getBaseDate();
    let start, end;

    if (reportType === 'Weekly') {
      const day = base.getDay();
      const diffToMonday = base.getDate() - day + (day === 0 ? -6 : 1); 
      start = new Date(base.getFullYear(), base.getMonth(), diffToMonday);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } 
    else if (reportType === 'Monthly') {
      start = new Date(base.getFullYear(), base.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(base.getFullYear(), base.getMonth() + 1, 0); 
      end.setHours(23, 59, 59, 999);
    } 
    else { 
      start = new Date(base.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(base.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  };

  const formatDateForAPI = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    const loadReportData = async () => {
      setIsLoading(true);
      try {
        const { start, end } = getPeriodBoundaries();
        const startDateStr = formatDateForAPI(start);
        const endDateStr = formatDateForAPI(end);

        const data = await analyticsService.getSystemReport(startDateStr, endDateStr, reportType);
        setPreviewData(data);
      } catch (err) {
        console.error("Failed to load report analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadReportData();
  }, [reportType, selectedDate]);

  const currentDetails = useMemo(() => {
    const { start, end } = getPeriodBoundaries();
    const base = getBaseDate();

    switch (reportType) {
      case 'Weekly':
        return {
          period: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          contents: 'Daily collection summary, zone coverage breakdown, and issue tracking for the selected week.'
        };
      case 'Monthly':
        return {
          period: base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          contents: 'Monthly aggregated collection data, overall zone metrics, and top recurring issues.'
        };
      case 'Annual':
        return {
          period: `Year ${base.getFullYear()}`,
          contents: 'Year-end comprehensive review of total waste collections, area coverage efficiency, and long-term trends.'
        };
      default:
        return { period: '', contents: '' };
    }
  }, [reportType, selectedDate]);

  const handleDownloadPDF = async () => {
    if (!previewData) return;
    
    setIsDownloading(true);
    try {
      console.log("Waiting for React to finish rendering...");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log("Capturing exact UI layout cleanly...");
      await generateSystemReport(`${reportType} Report`);
      
    } catch (error) {
      console.error("PDF GENERATION CRASHED:", error);
      alert(`CRASH REASON: ${error.message || error}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex h-full w-full bg-slate-50 font-sans text-slate-800">
      
      {/* LEFT SIDEBAR */}
      <div className="w-[280px] p-5 flex flex-col h-full shrink-0 z-20 overflow-y-auto border-r border-slate-200 bg-slate-50/50">
        
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-emerald-700 font-bold text-xs transition-colors w-fit mb-5"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* TARGET DATE SELECTOR */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 mb-4">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
            <CalendarDays size={14} className="text-emerald-600" /> Target Date
          </h3>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-[13px] font-semibold text-slate-700 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0f9d58]/20 focus:border-[#0f9d58] outline-none transition-all cursor-pointer"
          />
        </div>

        {/* CARD 1: REPORT TYPE */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 mb-4">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">Report Type</h3>
          
          <div className="space-y-2">
            {['Weekly', 'Monthly', 'Annual'].map((type) => {
              const icons = { Weekly: Calendar, Monthly: CalendarDays, Annual: BarChart2 };
              const colors = { Weekly: 'emerald', Monthly: 'sky', Annual: 'indigo' };
              const Icon = icons[type];
              const colorPrefix = colors[type];
              const isActive = reportType === type;

              return (
                <div 
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isActive ? 'bg-[#0f9d58] text-white shadow-md shadow-emerald-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                      <Icon size={16} className={isActive ? 'text-white' : `text-${colorPrefix}-600`} />
                    </div>
                    <div>
                      <p className={`font-bold text-[13px] ${isActive ? 'text-white' : 'text-slate-800'}`}>{type} Report</p>
                    </div>
                  </div>
                  {isActive && <Check size={16} className="text-white mr-1" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 2: REPORT INFO */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-100 mb-4">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">Report Info</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 text-[#0f9d58] rounded-lg shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold mb-0.5">Report</p>
                <p className="text-[13px] font-bold text-slate-800">{reportType} Report</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 text-[#0f9d58] rounded-lg shrink-0">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold mb-0.5">Period</p>
                <p className="text-[13px] font-bold text-slate-800 leading-tight">{currentDetails.period}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 text-[#0f9d58] rounded-lg shrink-0">
                <Info size={16} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-semibold mb-0.5">Contents</p>
                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                  {currentDetails.contents}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Header */}
        <div className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Report Preview</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Previewing data for the <span className="text-[#0f9d58] font-bold">{reportType}</span> report generation.
            </p>
          </div>
          
          <button 
            onClick={handleDownloadPDF}
            disabled={isLoading || !previewData || isDownloading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0f9d58] text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg focus:ring-4 focus:ring-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <><Loader2 size={16} className="animate-spin" /> Generating PDF...</>
            ) : (
              <><Download size={16} /> Download PDF</>
            )}
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          {isLoading || !previewData ? (
            <div className="flex items-center justify-center h-full w-full">
              <div className="flex flex-col items-center gap-3 text-slate-400 font-bold animate-pulse">
                <FileText size={32} />
                Gathering Analytics...
              </div>
            </div>
          ) : (
            
            /* --- THE DOCUMENT PREVIEW PAGE --- */
            <div 
              id="report-pdf-content"
              className="bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] w-full max-w-[850px] min-h-[1100px] p-12 relative overflow-hidden ring-1 ring-slate-200/50 mb-10 rounded-sm"
            >
              
              {/* 🔥 SECTION 1: HEADER & KPIS 🔥 */}
              <div className="pdf-section bg-white mb-10">
                <div className="pb-6 border-b border-emerald-600/20 mb-8">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#0f9d58] rounded-2xl flex items-center justify-center shadow-sm">
                        <Recycle size={30} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-[#047857] tracking-tight">Aksyon Basura</h2>
                        <h3 className="text-[13px] font-medium text-slate-500 mt-0.5">Barangay Nazareth, Cagayan De Oro City</h3>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl px-4 py-2 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Report Type</span>
                      <span className="text-lg font-bold text-emerald-800">{reportType} Report</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-[13px] text-slate-500">
                    <div>
                      Period: <span className="text-slate-800 font-semibold ml-1">{currentDetails.period}</span>
                    </div>
                    <div>
                      Prepared by: <span className="text-slate-800 font-semibold ml-1">Waste Management Office</span>
                    </div>
                    <div>
                      Generated: <span className="text-slate-800 font-semibold ml-1">
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-3xl font-black text-[#0f9d58]">{previewData.totalCollections}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Total Collections</p>
                  </div>
                  <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-3xl font-black text-emerald-700">{previewData.resolvedReports}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Reports Resolved</p>
                  </div>
                  <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-3xl font-black text-amber-600">{previewData.pendingReports}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Pending Reports</p>
                  </div>
                  <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-3xl font-black text-rose-500">{previewData.missedCollections}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Missed Bins</p>
                  </div>
                </div>
              </div>

              {/* 🔥 SECTION 2: TIMELINE SUMMARY 🔥 */}
              <div className="pdf-section bg-white mb-10">
                <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <CalendarDays size={18} className="text-[#0f9d58]" /> 
                  {reportType === 'Weekly' ? 'Daily' : reportType === 'Monthly' ? 'Weekly' : 'Monthly'} Collection Summary
                </h4>
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0f9d58] text-white">
                        <th className="p-3.5 font-bold text-xs uppercase tracking-wider">
                           {reportType === 'Weekly' ? 'Day' : reportType === 'Monthly' ? 'Week' : 'Month'}
                        </th>
                        <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-center">Collections</th>
                        <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-center">Reports Filed</th>
                        <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-center">Resolved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {previewData.dailySummaryTable.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3.5 text-sm font-semibold text-slate-700">{row.period_name}</td>
                          <td className="p-3.5 text-sm font-medium text-slate-600 text-center">{row.collections}</td>
                          <td className="p-3.5 text-sm font-medium text-slate-600 text-center">{row.reports}</td>
                          <td className="p-3.5 text-sm font-bold text-center">
                            {row.reports === 0 ? '-' : (
                              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-xs">
                                {row.resolved} / {row.reports}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 🔥 SECTION 3: NEW ZONE PERFORMANCE SUMMARY 🔥 */}
              <div className="pdf-section bg-white mb-10">
                <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-[#0f9d58]" /> Zone Performance Summary
                </h4>
                {previewData.zoneCoverageTable.length > 0 ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider">Zone</th>
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-center">Bins (Collected / Total)</th>
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-center">Bin Rate</th>
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-center">Reports (Resolved / Total)</th>
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-right">Resolution Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {previewData.zoneCoverageTable.map((row, idx) => {
                          const binRate = row.total_bins > 0 ? Math.round((row.collected_bins / row.total_bins) * 100) : 100;
                          const reportRate = row.total_reports > 0 ? Math.round((row.resolved_reports / row.total_reports) * 100) : 100;
                          
                          const getRateStyle = (rate) => {
                            if (rate >= 80) return "text-[#0f9d58] bg-emerald-50";
                            if (rate >= 50) return "text-amber-600 bg-amber-50";
                            return "text-rose-600 bg-rose-50";
                          };

                          return (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3.5 text-sm font-bold text-emerald-700">{row.zone}</td>
                              
                              {/* BIN COUNTS */}
                              <td className="p-3.5 text-sm font-medium text-slate-600 text-center">
                                <span className="font-bold text-slate-800">{row.collected_bins}</span> / {row.total_bins}
                              </td>
                              
                              {/* BIN RATE */}
                              <td className="p-3.5 text-center">
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${getRateStyle(binRate)}`}>
                                  {binRate}%
                                </span>
                              </td>
                              
                              {/* REPORT COUNTS */}
                              <td className="p-3.5 text-sm font-medium text-slate-600 text-center">
                                <span className="font-bold text-slate-800">{row.resolved_reports}</span> / {row.total_reports}
                              </td>
                              
                              {/* REPORT RATE */}
                              <td className="p-3.5 text-right">
                                {row.total_reports > 0 ? (
                                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${getRateStyle(reportRate)}`}>
                                    {reportRate}%
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    No zone performance data recorded for this period.
                  </p>
                )}
              </div>

              {/* 🔥 SECTION 4: TOP REPORTED ISSUES 🔥 */}
              <div className="pdf-section bg-white mb-10">
                <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-[#0f9d58]" /> Top Reported Issues
                </h4>
                <div className="pr-10">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      {previewData.topIssues.length > 0 ? previewData.topIssues.map((issue, idx) => {
                        const maxIssueCount = previewData.topIssues[0][1];
                        const percentage = (issue[1] / maxIssueCount) * 100;
                        
                        return (
                          <tr key={idx}>
                            <td className="py-4 pr-4 text-sm font-black text-slate-400 w-8">{idx + 1}.</td>
                            <td className="py-4 text-sm font-semibold text-slate-700 w-[200px]">{issue[0]}</td>
                            <td className="py-4 w-full px-4">
                              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                                <div 
                                  className="bg-[#0f9d58] h-3.5 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </td>
                            <td className="py-4 text-sm font-black text-slate-800 text-right w-12">{issue[1]}</td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan="4" className="py-6 text-sm text-slate-500 italic bg-slate-50 rounded-xl text-center">No issues reported in this period.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 🔥 SECTION 5: ZONE INCIDENT HOTSPOTS 🔥 */}
              <div className="pdf-section bg-white mb-4">
                <h4 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-500" /> Incident Hotspots by Zone
                </h4>
                {previewData.zoneIncidentTable && previewData.zoneIncidentTable.length > 0 ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800 text-white">
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider">Zone</th>
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-center">Total Reports</th>
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider">Top Issue</th>
                          <th className="p-3.5 font-bold text-xs uppercase tracking-wider text-center">Issue Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {previewData.zoneIncidentTable.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3.5 text-sm font-bold text-emerald-700">{row.zone_name}</td>
                            <td className="p-3.5 text-sm font-black text-slate-700 text-center">{row.total_zone_reports}</td>
                            <td className="p-3.5 text-sm font-medium text-slate-600">
                              <span className="bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-xs font-bold border border-rose-100">
                                {row.top_issue}
                              </span>
                            </td>
                            <td className="p-3.5 text-sm font-bold text-rose-600 text-center">{row.top_issue_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    No incident reports logged for this period.
                  </p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;