/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  parseISO 
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Users, 
  Calendar as CalendarIcon, 
  Clock, 
  Download, 
  Settings2,
  Trash2,
  UserPlus,
  Stethoscope,
  Info,
  Search,
  Filter,
  Palmtree,
  CalendarDays,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Nurse, NurseRoster, ShiftType } from './types';
import { SHIFT_COLORS, SHIFT_LABELS, SHIFT_HOURS } from './constants';
import { generateMonthlyRoster } from './lib/roster-logic';
import { TRANSLATIONS, Language } from './lib/translations';

// Initial data based on the user's spreadsheet groupings
const INITIAL_NURSES: Nurse[] = [
  // LICENCIADAS NOMBRADOS
  { id: '1', name: 'LIC. HUALLPA LEON DINA', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 0, vacations: [{ start: '2026-05-01', end: '2026-05-15' }], hiringDate: '2020-01-01' },
  { id: '2', name: 'LIC. QUILLATUPA VIDAL ROSA LIZ', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 1, vacations: [], hiringDate: '2020-01-01' },
  { id: '3', name: 'LIC. MONTORO LILIANA', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 2, vacations: [], hiringDate: '2020-01-01' },
  { id: '4', name: 'LIC. VASQUEZ OROPEZA VANESSA', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 3, vacations: [], hiringDate: '2020-01-01' },
  { id: '5', name: 'LIC. ARANDA DEPAZ YUDY MARLA', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 4, vacations: [], hiringDate: '2020-01-01' },
  { id: '6', name: 'LIC. LUNA DE LA CRUZ GERTRUDIS FLOR', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 0, vacations: [], hiringDate: '2020-01-01' },
  { id: '7', name: 'LIC. VILLACHICA TOSCANO NELLY', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 1, vacations: [], hiringDate: '2020-01-01' },
  { id: '8', name: 'LIC. SALAZAR SANCHEZ ADRIANA ROSARIO', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 2, vacations: [], hiringDate: '2020-01-01' },
  { id: '9', name: 'LIC. ROBLES CACERES GLADYS MERCEDES', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 3, vacations: [], hiringDate: '2020-01-01' },
  { id: '10', name: 'LIC. ZORRILLA DE CUADROS MAXIMINA', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 4, vacations: [], hiringDate: '2020-01-01' },
  { id: '11', name: 'LIC. GONZALES CRISOSTOMO GEORGINA PAOLA', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 0, vacations: [], hiringDate: '2020-01-01' },
  { id: '12', name: 'LIC. JACOME MAGUIÑA ELIDA MARY', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 1, vacations: [], hiringDate: '2020-01-01' },
  { id: '13', name: 'LIC. COLONIA SILVA TATIANA', role: 'Licenciada', groupId: 'LIC_NOMBRADOS', teamId: 2, vacations: [], hiringDate: '2020-01-01' },
  
  // ENFERMERAS CAS
  { id: '14', name: 'LIC. BAZAN PERA EDITH', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 3, vacations: [], hiringDate: '2020-01-01' },
  { id: '15', name: 'LIC. JESUS ESCUDERO LEONOR LUCINDA', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 4, vacations: [], hiringDate: '2020-01-01' },
  { id: '25', name: 'LIC. RODRIGUEZ LOPEZ FLOR DE MARIA', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 0, vacations: [], hiringDate: '2020-01-01' },
  { id: '26', name: 'LIC. SALVADOR GIRALDO VANESSA VERONICA', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 1, vacations: [], hiringDate: '2020-01-01' },
  { id: '27', name: 'LIC. HUAYANEY CADILLO KARINA', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 2, vacations: [], hiringDate: '2020-01-01' },
  { id: '28', name: 'LIC. PANTOJA DOMINGUEZ ROSARIO ERIKA', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 3, vacations: [], hiringDate: '2020-01-01' },
  { id: '29', name: 'LIC. LIÑAN SANTOYO HELENE ELIZABETH', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 4, vacations: [], hiringDate: '2020-01-01' },
  { id: '30', name: 'LIC. PICON OSORIO KATHERINE MILAGROS', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 0, vacations: [], hiringDate: '2020-01-01' },
  { id: '31', name: 'LIC. ANDRADE SOSA DELSY XIOMARA', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 1, vacations: [], hiringDate: '2020-01-01' },
  { id: '32', name: 'LIC. NORABUENA JACOME GABRIELA', role: 'Licenciada', groupId: 'LIC_CAS', teamId: 2, vacations: [], hiringDate: '2020-01-01' },
  
  // TECNICOS NOMBRADOS
  { id: '16', name: 'TEC. MACEDO ACUÑA RAYDA', role: 'Técnico', groupId: 'TEC_NOMBRADOS', teamId: 0, vacations: [], hiringDate: '2020-01-01' },
  { id: '17', name: 'TEC. RASHTA SOLANO GERARDO', role: 'Técnico', groupId: 'TEC_NOMBRADOS', teamId: 1, vacations: [], hiringDate: '2020-01-01' },
  { id: '18', name: 'TEC. CACHA TOLEDO ANTONIA', role: 'Técnico', groupId: 'TEC_NOMBRADOS', teamId: 2, vacations: [], hiringDate: '2020-01-01' },
  
  // TECNICOS CAS
  { id: '19', name: 'TEC. LLAUCE RODRIGUEZ LILIANA', role: 'Técnico', groupId: 'TEC_CAS', teamId: 3, vacations: [], hiringDate: '2020-01-01' },
  { id: '20', name: 'TEC. ROQUE MEDRANO BHANNI NEBAHI', role: 'Técnico', groupId: 'TEC_CAS', teamId: 4, vacations: [], hiringDate: '2020-01-01' },
  { id: '21', name: 'TEC. CUEVA VALENZUELA ARTURO', role: 'Técnico', groupId: 'TEC_CAS', teamId: 0, vacations: [], hiringDate: '2020-01-01' },
  { id: '22', name: 'TEC. VELASQUEZ JURUMY YESSICA', role: 'Técnico', groupId: 'TEC_CAS', teamId: 1, vacations: [], hiringDate: '2020-01-01' },
  { id: '23', name: 'TEC. REMIGIO JULCA LIDIA KARINA', role: 'Técnico', groupId: 'TEC_CAS', teamId: 2, vacations: [], hiringDate: '2020-01-01' },

  // SUPERVISORA
  { id: '24', name: 'LIC. MANRIQUE ORDEANO MAGNOLIA', role: 'Supervisora', groupId: 'SUPERVISORA', teamId: 0, vacations: [], hiringDate: '2020-01-01' },
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4)); // Mayo 2026
  const [nurses, setNurses] = useState<Nurse[]>(INITIAL_NURSES);
  const [view, setView] = useState<'roster' | 'staff'>('roster');
  const [showAddNurse, setShowAddNurse] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEditCell, setActiveEditCell] = useState<{ nurseId: string, date: string, x: number, y: number } | null>(null);

  const t = TRANSLATIONS[lang];
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [editingVacationsId, setEditingVacationsId] = useState<string | null>(null);

  const monthYearLabel = format(currentDate, 'MMMM yyyy');
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const roster = useMemo(() => {
    return generateMonthlyRoster(nurses, currentDate.getFullYear(), currentDate.getMonth());
  }, [nurses, currentDate]);

  const filteredRoster = useMemo(() => {
    return roster.filter(item => {
      const matchSearch = item.nurse.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'all' || item.nurse.role === roleFilter;
      const matchGroup = groupFilter === 'all' || item.nurse.groupId === groupFilter;
      return matchSearch && matchRole && matchGroup;
    });
  }, [roster, searchQuery, roleFilter, groupFilter]);

  const groupedRoster = useMemo(() => {
    const groups: Record<string, NurseRoster[]> = {};
    filteredRoster.forEach(item => {
      const gid = item.nurse.groupId;
      if (!groups[gid]) groups[gid] = [];
      groups[gid].push(item);
    });
    return groups;
  }, [filteredRoster]);

  const stats = useMemo(() => {
    const dailyCounts = daysInMonth.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      let gdCount = 0;
      let gnCount = 0;
      let mCount = 0;
      let tCount = 0;

      // Role specific counts
      let licGD = 0;
      let licGN = 0;
      let tecGD = 0;
      let tecGN = 0;

      roster.forEach(r => {
        const dayShift = r.days.find(d => d.date === dateStr)?.shift;
        const isLic = r.nurse.role === 'Licenciada';
        const isTec = r.nurse.role === 'Técnico';

        if (dayShift === 'GD') {
          gdCount++;
          if (isLic) licGD++;
          else if (isTec) tecGD++;
        }
        if (dayShift === 'GN') {
          gnCount++;
          if (isLic) licGN++;
          else if (isTec) tecGN++;
        }
        if (dayShift === 'M') mCount++;
        if (dayShift === 'T') tCount++;
      });
      return { 
        date: dateStr, 
        GD: gdCount, GN: gnCount, M: mCount, T: tCount,
        licGD, licGN, tecGD, tecGN
      };
    });
    return dailyCounts;
  }, [daysInMonth, roster]);

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  const addNurse = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newNurse: Nurse = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      role: formData.get('role') as any,
      groupId: formData.get('groupId') as any,
      teamId: parseInt(formData.get('teamId') as string),
      vacations: [],
      hiringDate: '2026-01-01'
    };
    setNurses([...nurses, newNurse]);
    setShowAddNurse(false);
  };

  const removeNurse = (id: string) => {
    setNurses(nurses.filter(n => n.id !== id));
  };

  const addVacation = (nurseId: string, start: string, end: string) => {
    setNurses(nurses.map(n => {
      if (n.id === nurseId) {
        return { ...n, vacations: [...n.vacations, { start, end }] };
      }
      return n;
    }));
  };

  const removeVacation = (nurseId: string, index: number) => {
    setNurses(nurses.map(n => {
      if (n.id === nurseId) {
        const newVacations = [...n.vacations];
        newVacations.splice(index, 1);
        return { ...n, vacations: newVacations };
      }
      return n;
    }));
  };

  const setManualShift = (nurseId: string, date: string, shift: ShiftType | null) => {
    setNurses(nurses.map(n => {
      if (n.id === nurseId) {
        const newOverrides = { ...(n.overrides || {}) };
        if (shift === null) {
          delete newOverrides[date];
        } else {
          newOverrides[date] = shift;
        }
        return { ...n, overrides: newOverrides };
      }
      return n;
    }));
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1A1A] font-sans selection:bg-blue-100 italic-serif-headers">
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#E5E5E1] p-6 z-20 hidden lg:flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-blue-600 rounded-lg text-white">
            <Stethoscope size={24} />
          </div>
          <h1 className="font-semibold text-xl tracking-tight">Hospithro</h1>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => setView('roster')}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
              view === 'roster' ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <CalendarIcon size={18} />
            {t.roster}
          </button>
          <button 
            onClick={() => setView('staff')}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
              view === 'staff' ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <Users size={18} />
            {t.directory}
          </button>
        </div>

        <div className="mt-auto p-4 bg-gray-50 rounded-xl space-y-3 font-mono text-[10px] leading-relaxed border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400 uppercase tracking-widest font-bold">
            <Info size={12} />
            {t.ruleEngine}
          </div>
          <ul className="space-y-1.5 text-gray-600">
            <li>• {t.rotation}: GD → GN → L → L → L</li>
            <li>• {t.shiftLength}: 12 Hours</li>
            <li>• {t.target}: 144 Hours / Month</li>
            <li>• {t.staffing}: Min 4 Nurses / Shift</li>
          </ul>
        </div>
      </nav>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 lg:p-8 min-h-screen">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight capitalize font-sans">{monthYearLabel}</h2>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase ring-1 ring-blue-100">
                {nurses.length} {t.staffing}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Hospital Victor Ramos Guardia • Nursing Department</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle (Mobile Friendly) */}
            <div className="flex bg-blue-50 p-1 rounded-lg gap-1 border border-blue-100 mr-2 shadow-sm">
              <button 
                onClick={() => setShowInfo(true)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors mr-1"
                title={t.aboutApp}
              >
                <Info size={18} />
              </button>
              <div className="w-px h-6 bg-blue-200/50 my-auto mx-1" />
              <button 
                onClick={() => setLang('en')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-black transition-all flex items-center gap-1",
                  lang === 'en' ? "bg-blue-600 text-white shadow-md scale-105" : "text-blue-400 hover:text-blue-600"
                )}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('es')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[10px] font-black transition-all flex items-center gap-1",
                  lang === 'es' ? "bg-blue-600 text-white shadow-md scale-105" : "text-blue-400 hover:text-blue-600"
                )}
              >
                ES
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg flex shadow-sm overflow-hidden">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-50 border-r border-gray-100 transition-colors"
                title={t.prevMonth}
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-50 transition-colors"
                title={t.nextMonth}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm">
              <Download size={16} />
              {t.exportPdf}
            </button>
          </div>
        </header>

        {view === 'roster' ? (
          <div className="space-y-6">
            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <Filter size={14} className="text-gray-400" />
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t.role}:</span>
                  <select 
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="bg-transparent text-sm font-medium focus:outline-none"
                  >
                    <option value="all">{t.allRoles}</option>
                    <option value="Licenciada">{t.roles['Licenciada']}</option>
                    <option value="Técnico">{t.roles['Técnico']}</option>
                    <option value="Supervisora">{t.roles['Supervisora']}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{t.group}:</span>
                  <select 
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="bg-transparent text-sm font-medium focus:outline-none"
                  >
                    <option value="all">{t.allGroups}</option>
                    {Object.entries(t.groupLabels).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>

                {(searchQuery || roleFilter !== 'all' || groupFilter !== 'all') && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setRoleFilter('all');
                      setGroupFilter('all');
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium px-2"
                  >
                    {t.clearFilters}
                  </button>
                )}
              </div>
            </div>

            {/* Grid Legend */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-mono mb-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-gray-400 uppercase tracking-widest mr-2 font-black">{t.legend}:</span>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-8 h-6 flex items-center justify-center rounded bg-blue-100 text-blue-700 font-bold border border-blue-200">D</span>
                <span className="text-gray-600 font-medium">{t.dayGuard} (12h)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-8 h-6 flex items-center justify-center rounded bg-indigo-900 text-indigo-50 font-bold border border-indigo-950">N</span>
                <span className="text-gray-600 font-medium">{t.nightGuard} (12h)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-8 h-6 flex items-center justify-center rounded bg-teal-50 text-teal-700 font-bold border border-teal-100">M</span>
                <span className="text-gray-600 font-medium">{t.morning} (6h)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-8 h-6 flex items-center justify-center rounded bg-orange-50 text-orange-700 font-bold border border-orange-100">T</span>
                <span className="text-gray-600 font-medium">{t.afternoon} (6h)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-8 h-6 flex items-center justify-center rounded bg-amber-100 text-amber-700 font-bold border border-amber-200">O</span>
                <span className="text-gray-600 font-medium">{t.birthday}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-8 h-6 flex items-center justify-center rounded bg-gray-50 text-gray-400 font-bold border border-gray-100">L</span>
                <span className="text-gray-600 font-medium">{t.off} (L)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="w-10 h-6 flex items-center justify-center rounded bg-rose-100 text-rose-700 font-bold border border-rose-200 text-[10px]">VAC</span>
                <span className="text-gray-600 font-medium">{t.vacation}</span>
              </div>
            </div>

            {/* Roster Grid Container */}
            <div className="bg-white border border-[#E5E5E1] rounded-2xl shadow-sm overflow-hidden overflow-x-auto relative">
              <table className="w-full border-collapse table-fixed min-w-[2000px]">
                <thead className="bg-[#F9F9F8] border-bottom-2 border-[#141414]">
                  <tr>
                    <th className="sticky left-0 z-10 w-64 bg-[#F9F9F8] p-4 text-left font-mono text-[11px] uppercase tracking-wider text-gray-500 border-r border-[#E5E5E1]">
                      Staff Name
                    </th>
                    {daysInMonth.map(day => (
                      <th key={day.toISOString()} className={cn(
                        "w-12 p-2 text-center border-r border-[#E5E5E1]",
                        format(day, 'EEEEEE') === 'Su' ? "bg-red-50/30" : ""
                      )}>
                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                          {format(day, 'EEE')}
                        </div>
                        <div className="text-sm font-mono font-medium">
                          {format(day, 'd')}
                        </div>
                      </th>
                    ))}
                    <th className="w-12 p-2 text-center text-[10px] uppercase font-black text-gray-600 border-r border-[#E5E5E1]">GD</th>
                    <th className="w-12 p-2 text-center text-[10px] uppercase font-black text-gray-600 border-r border-[#E5E5E1]">GN</th>
                    <th className="w-12 p-2 text-center text-[10px] uppercase font-black text-gray-600 border-r border-[#E5E5E1]">M</th>
                    <th className="w-12 p-2 text-center text-[10px] uppercase font-black text-gray-600 border-r border-[#E5E5E1]">T</th>
                    <th className="w-16 p-1 text-center text-[9px] leading-tight uppercase font-black text-gray-600 border-r border-[#E5E5E1]">{t.sunNight}</th>
                    <th className="w-16 p-1 text-center text-[9px] leading-tight uppercase font-black text-gray-600 border-r border-[#E5E5E1]">{t.holidayNight}</th>
                    <th className="w-16 p-1 text-center text-[9px] leading-tight uppercase font-black text-gray-600 border-r border-[#E5E5E1]">{t.sunDay}</th>
                    <th className="w-20 p-2 text-center text-[10px] uppercase font-bold text-blue-600 bg-blue-50/50">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E1]">
                  {(Object.entries(groupedRoster) as [string, NurseRoster[]][]).map(([groupId, groupRows]) => (
                    <React.Fragment key={groupId}>
                      {/* Group Header Row */}
                      <tr className="bg-gray-100/50 border-y border-[#E5E5E1]">
                        <td 
                          colSpan={daysInMonth.length + 9} 
                          className="p-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-50/50 flex justify-between items-center"
                        >
                          <span>{t.groupLabels[groupId as keyof typeof t.groupLabels] || groupId}</span>
                          <span className="text-gray-300 ml-4 font-mono">({groupRows.length})</span>
                        </td>
                      </tr>
                      {groupRows.map((row) => (
                        <motion.tr 
                          layout
                          key={row.nurse.id} 
                          className="group hover:bg-[#141414] hover:text-white transition-colors duration-150 cursor-default"
                        >
                          <td className="sticky left-0 z-10 bg-white group-hover:bg-[#141414] p-4 border-r border-[#E5E5E1] font-mono text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis shadow-[4px_0_10px_rgba(0,0,0,0.02)] group-hover:shadow-none transition-colors">
                            <div className="flex flex-col">
                              <span>{row.nurse.name}</span>
                              <span className="text-[9px] opacity-40 uppercase font-bold group-hover:opacity-60">{t.roles[row.nurse.role as keyof typeof t.roles] || row.nurse.role}</span>
                            </div>
                          </td>
                          {row.days.map((day, idx) => (
                            <td 
                              key={idx} 
                              className={cn(
                                "p-1.5 border-r border-[#E5E5E1] transition-all cursor-pointer relative",
                                format(parseISO(day.date), 'EEEEEE') === 'Su' ? "bg-red-50/10" : ""
                              )}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveEditCell({
                                  nurseId: row.nurse.id,
                                  date: day.date,
                                  x: rect.left,
                                  y: rect.bottom
                                });
                              }}
                            >
                              <div className={cn(
                                "w-full h-8 flex items-center justify-center rounded-md font-mono text-[10px] font-bold transition-all duration-300",
                                row.nurse.overrides?.[day.date] && "ring-2 ring-blue-400 ring-offset-1",
                                day.shift === 'GD' && "bg-blue-100 text-blue-700 shadow-sm ring-1 ring-blue-200",
                                day.shift === 'GN' && "bg-indigo-900 text-white shadow-xl ring-1 ring-indigo-950",
                                day.shift === 'M' && "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100",
                                day.shift === 'T' && "bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100",
                                day.shift === 'O' && "bg-amber-100 text-amber-700 shadow-sm ring-1 ring-amber-200",
                                day.shift === 'L' && "text-gray-300 group-hover:text-gray-400",
                                day.shift === 'V' && "bg-rose-100 text-rose-800 text-[10px] uppercase font-black ring-1 ring-rose-200"
                              )}>
                                {day.shift === 'V' ? 'VAC' : (day.shift === 'L' ? '-' : (day.shift === 'GD' ? 'D' : (day.shift === 'GN' ? 'N' : day.shift)))}
                              </div>
                            </td>
                          ))}
                           <td className="p-2 text-center font-mono text-[11px] text-gray-600 border-r border-[#E5E5E1] bg-gray-50/20">
                            {row.days.filter(d => d.shift === 'GD').length}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-gray-600 border-r border-[#E5E5E1] bg-gray-50/20">
                            {row.days.filter(d => d.shift === 'GN').length}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-gray-600 border-r border-[#E5E5E1] bg-gray-50/20">
                            {row.days.filter(d => d.shift === 'M').length}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-gray-600 border-r border-[#E5E5E1] bg-gray-50/20">
                            {row.days.filter(d => d.shift === 'T').length}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-indigo-700 border-r border-[#E5E5E1] bg-indigo-50/30 font-black">
                            {row.days.filter(d => d.shift === 'GN' && format(parseISO(d.date), 'EEEEEE') === 'Su').length}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-gray-600 border-r border-[#E5E5E1] bg-gray-50/20">
                            {row.days.filter(d => d.shift === 'O').length}
                          </td>
                          <td className="p-2 text-center font-mono text-[11px] text-blue-700 border-r border-[#E5E5E1] bg-blue-50/30 font-black">
                            {row.days.filter(d => d.shift === 'GD' && format(parseISO(d.date), 'EEEEEE') === 'Su').length}
                          </td>
                          <td className="p-2 text-center font-mono text-xs font-black bg-blue-50/30 text-blue-700 group-hover:bg-transparent">
                            {row.totalHours}h
                          </td>
                        </motion.tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-[#141414]">
                  {/* Row 1: TOTAL */}
                  <tr className="bg-gray-100/80 font-mono text-[10px] border-b border-gray-200">
                    <td className="sticky left-0 z-10 bg-gray-100 p-3 border-r border-[#E5E5E1] font-black text-gray-700 uppercase tracking-widest text-[11px]">
                      {t.staffingShift} (ALL)
                    </td>
                    {stats.map((stat, idx) => (
                      <td key={idx} className="p-1 border-r border-[#E5E5E1] bg-gray-50/50">
                        <div className="flex flex-col items-center justify-center py-1 gap-0.5">
                          <span className="text-[10px] font-black text-blue-600 leading-none">D:{stat.GD}</span>
                          <span className="text-[10px] font-black text-indigo-900 leading-none">N:{stat.GN}</span>
                        </div>
                      </td>
                    ))}
                    <td colSpan={8} className="bg-gray-50/50"></td>
                  </tr>

                  {/* Row 2: LIC */}
                  <tr className="bg-white font-mono text-[10px] border-b border-gray-100">
                    <td className="sticky left-0 z-10 bg-white p-3 border-r border-[#E5E5E1] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2 text-[11px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      LICENCIADAS
                    </td>
                    {stats.map((stat, idx) => (
                      <td key={idx} className="p-1 border-r border-[#E5E5E1]">
                        <div className="flex flex-col items-center justify-center gap-1 py-1.5">
                          <div className={cn(
                            "px-1.5 py-0.5 rounded font-bold transition-all min-w-[24px] text-center",
                            stat.licGD < 4 ? "bg-red-50 text-red-600 ring-1 ring-red-100" : "bg-blue-50 text-blue-700"
                          )}>
                            {stat.licGD}D
                          </div>
                          <div className={cn(
                            "px-1.5 py-0.5 rounded font-bold text-white transition-all min-w-[24px] text-center",
                            stat.licGN < 4 ? "bg-red-600 shadow-sm" : "bg-indigo-900 shadow-sm"
                          )}>
                            {stat.licGN}N
                          </div>
                        </div>
                      </td>
                    ))}
                    <td colSpan={8}></td>
                  </tr>

                  {/* Row 3: TEC */}
                  <tr className="bg-white font-mono text-[10px] border-b border-gray-100">
                    <td className="sticky left-0 z-10 bg-white p-3 border-r border-[#E5E5E1] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 text-[11px]">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                       TÉCNICOS
                    </td>
                    {stats.map((stat, idx) => (
                      <td key={idx} className="p-1 border-r border-[#E5E5E1]">
                        <div className="flex flex-col items-center justify-center gap-1 py-1.5">
                          <div className="px-1.5 py-0.5 rounded font-bold text-blue-500 bg-gray-50 border border-blue-50 min-w-[24px] text-center">
                            {stat.tecGD}D
                          </div>
                          <div className="px-1.5 py-0.5 rounded font-bold text-indigo-400 bg-indigo-50 border border-indigo-100 min-w-[24px] text-center">
                            {stat.tecGN}N
                          </div>
                        </div>
                      </td>
                    ))}
                    <td colSpan={8}></td>
                  </tr>

                  {/* Row 4: Auxiliary (M/T) - Only if they exist in the month */}
                  <tr className="bg-gray-50/30 font-mono text-[9px]">
                    <td className="sticky left-0 z-10 bg-gray-50 p-3 border-r border-[#E5E5E1] font-bold text-gray-400 uppercase tracking-widest text-[11px]">
                      REFUERZO (M/T)
                    </td>
                    {stats.map((stat, idx) => (
                      <td key={idx} className="p-1 border-r border-[#E5E5E1]">
                        <div className="flex flex-col items-center justify-center gap-0.5 opacity-60 min-h-[20px]">
                          {stat.M > 0 && <span className="text-teal-600 font-bold leading-none">M:{stat.M}</span>}
                          {stat.T > 0 && <span className="text-orange-600 font-bold leading-none">T:{stat.T}</span>}
                        </div>
                      </td>
                    ))}
                    <td colSpan={8}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Clock size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-700">{t.utilization}</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-500">{t.avgHours}</span>
                      <span className="font-mono font-bold">144.2h</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 w-[98%]" />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400">{t.targetHours}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Users size={20} />
                  </div>
                  <h3 className="font-semibold text-gray-700">{t.teamBalance}</h3>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="text-[10px] font-bold text-gray-400 mb-1">T{i+1}</div>
                      <div className={cn(
                        "w-full h-12 rounded-lg border flex items-center justify-center font-mono text-sm",
                        i === 3 || i === 4 ? "bg-gray-50 border-gray-100 text-gray-400" : "bg-blue-50 border-blue-100 text-blue-600"
                      )}>
                        {i < 3 ? '5' : '4'}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-4">{t.totalStaff}: {nurses.length} {t.activeNurses}.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Settings2 size={24} />
                </div>
                <h3 className="font-semibold text-gray-700">{t.autoScheduler}</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                  {t.autoSchedulerDesc}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{t.directory} ({nurses.length})</h3>
              <button 
                onClick={() => setShowAddNurse(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-md"
              >
                <UserPlus size={16} />
                {t.addStaff}
              </button>
            </div>

             <div className="space-y-12">
              {Object.entries(t.groupLabels).map(([groupId, label]) => {
                const groupStaff = nurses.filter(n => n.groupId === groupId);
                if (groupStaff.length === 0) return null;

                return (
                  <div key={groupId} className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-4 px-2">
                      {label}
                      <span className="h-px bg-gray-100 flex-1" />
                      <span className="bg-gray-50 px-2 py-0.5 rounded text-[10px]">{groupStaff.length}</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <AnimatePresence>
                        {groupStaff.map((nurse) => (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={nurse.id}
                            className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                  <Users size={24} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-800 leading-tight">{nurse.name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                      {nurse.role}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono">Team {nurse.teamId + 1}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => setEditingVacationsId(nurse.id)}
                                  className="text-gray-300 hover:text-emerald-600 transition-colors p-1"
                                  title={t.manageVacations}
                                >
                                  <Palmtree size={18} />
                                </button>
                                <button 
                                  onClick={() => removeNurse(nurse.id)}
                                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                              <span>{t.joined}: {format(parseISO(nurse.hiringDate), 'MMM yyyy')}</span>
                              <div className="flex -space-x-2">
                                {nurse.vacations.length > 0 && (
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-emerald-700">VAC</div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Manual Shift Edit Popover */}
      <AnimatePresence>
        {activeEditCell && (
          <div className="fixed inset-0 z-[100]" onClick={() => setActiveEditCell(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute bg-white border border-gray-200 rounded-xl shadow-2xl p-2 min-w-[140px] flex flex-col gap-1"
              style={{ 
                left: Math.min(activeEditCell.x, window.innerWidth - 160), 
                top: Math.min(activeEditCell.y + 5, window.innerHeight - 300)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                {t.setShift}
              </div>
              {(['GD', 'GN', 'M', 'T', 'O', 'L'] as ShiftType[]).map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setManualShift(activeEditCell.nurseId, activeEditCell.date, s);
                    setActiveEditCell(null);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold",
                    s === 'GD' && "bg-blue-100 text-blue-700",
                    s === 'GN' && "bg-indigo-900 text-white",
                    s === 'M' && "bg-teal-50 text-teal-700",
                    s === 'T' && "bg-orange-50 text-orange-700",
                    s === 'O' && "bg-amber-100 text-amber-700",
                    s === 'L' && "bg-gray-100 text-gray-400"
                  )}>
                    {s === 'GD' ? 'D' : (s === 'GN' ? 'N' : s)}
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {lang === 'es' ? SHIFT_LABELS[s].split('(')[0] : s}
                  </span>
                </button>
              ))}
              
              <div className="h-px bg-gray-50 my-1" />
              
              <button
                onClick={() => {
                  setManualShift(activeEditCell.nurseId, activeEditCell.date, null);
                  setActiveEditCell(null);
                }}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors text-left"
              >
                <div className="w-5 h-5 rounded border border-red-100 flex items-center justify-center text-[10px]">
                  <X size={12} />
                </div>
                <span className="text-xs font-semibold">{t.resetToAuto}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Nurse Modal */}
      {showAddNurse && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8"
          >
            <h3 className="text-2xl font-bold mb-6 tracking-tight">{t.addStaff}</h3>
            <form onSubmit={addNurse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t.fullName}</label>
                <input required name="name" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono text-sm" placeholder="e.g. LIC. MARTINEZ ANA" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t.role}</label>
                  <select name="role" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm appearance-none">
                    <option value="Licenciada">{t.roles['Licenciada']}</option>
                    <option value="Técnico">{t.roles['Técnico']}</option>
                    <option value="Supervisora">{t.roles['Supervisora']}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t.group}</label>
                  <select name="groupId" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm appearance-none">
                    {Object.entries(t.groupLabels).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{t.teamGroup}</label>
                  <select name="teamId" className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-sm appearance-none">
                    <option value="0">Team 1 (Group A)</option>
                    <option value="1">Team 2 (Group B)</option>
                    <option value="2">Team 3 (Group C)</option>
                    <option value="3">Team 4 (Group D)</option>
                    <option value="4">Team 5 (Group E)</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddNurse(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {t.cancel}
                </button>
                <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                  {t.register}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Vacation Management Modal */}
      {editingVacationsId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
          >
            <div className="p-8 border-b border-gray-50 bg-gray-50/50">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{t.vacationMgmt}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {nurses.find(n => n.id === editingVacationsId)?.name}
                  </p>
                </div>
                <button 
                  onClick={() => setEditingVacationsId(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  addVacation(editingVacationsId, formData.get('start') as string, formData.get('end') as string);
                  e.currentTarget.reset();
                }}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t.startDate}</label>
                  <input required name="start" type="date" className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">{t.endDate}</label>
                  <input required name="end" type="date" className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all text-sm font-mono" />
                </div>
                <button 
                  type="submit" 
                  className="col-span-2 py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Plus size={18} />
                  {t.addVacationPeriod}
                </button>
              </form>
            </div>

            <div className="p-8 max-h-[300px] overflow-y-auto bg-white">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                {t.currentAssignments}
                <div className="h-px flex-1 bg-gray-50" />
              </h4>
              <div className="space-y-3">
                {nurses.find(n => n.id === editingVacationsId)?.vacations.length === 0 ? (
                  <div className="text-center py-8 text-gray-300 italic text-sm">
                    {t.noVacations}
                  </div>
                ) : (
                  nurses.find(n => n.id === editingVacationsId)?.vacations.map((vac, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-emerald-50/30 border border-emerald-50 rounded-2xl group transition-all hover:bg-emerald-50/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100/50 flex items-center justify-center text-emerald-600">
                          <CalendarDays size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">
                            {format(parseISO(vac.start), 'MMM d, yyyy')} — {format(parseISO(vac.end), 'MMM d, yyyy')}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mt-0.5">{t.approved}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeVacation(editingVacationsId, idx)}
                        className="p-2 text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 bg-gray-50/30 border-t border-gray-50 flex justify-end">
              <button 
                onClick={() => setEditingVacationsId(null)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-white transition-all shadow-sm active:scale-95"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative"
          >
            <div className="p-8 pb-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                  <Stethoscope size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-gray-900 leading-none">Hospithro</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{t.aboutApp}</p>
                </div>
              </div>

              <div className="space-y-6">
                <section>
                  <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-blue-600 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    {t.howItWorks}
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm font-medium">
                    {t.howItWorksDesc}
                  </p>
                </section>

                <section>
                  <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-blue-600 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    {t.features}
                  </h4>
                  <ul className="grid grid-cols-1 gap-2.5">
                    {[t.feature1, t.feature2, t.feature3, t.feature4].map((f, i) => (
                      <li key={i} className="flex gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100 hover:bg-white hover:border-blue-100 transition-all duration-300">
                        <div className="mt-1">
                          <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-blue-600" />
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 leading-snug">{f}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowInfo(false)}
                className="px-8 py-3 rounded-2xl bg-gray-900 text-white text-sm font-black uppercase tracking-widest shadow-xl hover:bg-gray-800 active:scale-95 transition-all"
              >
                {t.close}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
