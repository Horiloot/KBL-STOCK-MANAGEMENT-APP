import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ColdStorage } from '../../types';
import { Modal } from '../common/Modal';
import {
  Warehouse,
  PlusCircle,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  User,
  Download,
  Printer,
  Boxes,
} from 'lucide-react';
import { exportToExcel, validateAndTriggerPrint } from '../../utils/exportUtils';
import { ColdStorageEmptyState } from './ColdStorageEmptyState';

export const ColdStorageListView: React.FC = () => {
  const {
    coldStorages,
    addColdStorage,
    updateColdStorage,
    deleteColdStorage,
    stockTransactions,
    deliveryTransactions,
    hasPermission,
    companySettings,
    setActiveTab,
    setFilters,
    addToast,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStorage, setEditingStorage] = useState<ColdStorage | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [district, setDistrict] = useState('');
  const [capacity, setCapacity] = useState(50000);
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const openAddModal = () => {
    setEditingStorage(null);
    setCode(`CS-${coldStorages.length + 1}`);
    setName('');
    setLocation('');
    setDistrict('Dinajpur');
    setCapacity(50000);
    setContactPerson('');
    setContactPhone('');
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cs: ColdStorage) => {
    setEditingStorage(cs);
    setCode(cs.code);
    setName(cs.name);
    setLocation(cs.location);
    setDistrict(cs.district || '');
    setCapacity(cs.capacity);
    setContactPerson(cs.contactPerson || '');
    setContactPhone(cs.contactPhone || '');
    setIsActive(cs.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !location.trim()) {
      setFormError('Facility Code, Name, and Location are required.');
      return;
    }

    if (editingStorage) {
      updateColdStorage(editingStorage.id, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        location: location.trim(),
        district: district.trim() || undefined,
        capacity,
        rentPerBag: editingStorage.rentPerBag || 0,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        isActive,
      });
    } else {
      addColdStorage({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        location: location.trim(),
        district: district.trim() || undefined,
        capacity,
        rentPerBag: 0,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        isActive,
      });
    }

    setIsModalOpen(false);
  };

  const handleViewFacilityStock = (csId: string) => {
    setFilters({ coldStorageId: csId });
    setActiveTab('stock-register');
  };

  const handleExportExcel = () => {
    const rows = coldStorages.map((cs) => {
      const storedBags = stockTransactions
        .filter((s) => s.coldStorageId === cs.id)
        .reduce((acc, s) => acc + s.sackQuantity, 0);
      const delBags = deliveryTransactions
        .filter((d) => d.coldStorageId === cs.id)
        .reduce((acc, d) => acc + d.sackQuantity, 0);
      const remainingBags = storedBags - delBags;
      const occupancy = cs.capacity > 0 ? (remainingBags / cs.capacity) * 100 : 0;

      return {
        code: cs.code,
        name: cs.name,
        location: cs.location,
        district: cs.district || '-',
        capacity: cs.capacity,
        storedBags: remainingBags,
        occupancy: `${occupancy.toFixed(1)}%`,
        contact: cs.contactPerson || '-',
        phone: cs.contactPhone || '-',
      };
    });

    exportToExcel(
      rows,
      [
        { header: 'Code', key: 'code', width: 12 },
        { header: 'Storage Name', key: 'name', width: 28 },
        { header: 'Location', key: 'location', width: 22 },
        { header: 'District', key: 'district', width: 16 },
        { header: 'Capacity', key: 'capacity', width: 14 },
        { header: 'Current Bags', key: 'storedBags', width: 14 },
        { header: 'Occupancy', key: 'occupancy', width: 12 },
        { header: 'Contact Person', key: 'contact', width: 20 },
        { header: 'Phone', key: 'phone', width: 16 },
      ],
      'Cold_Storage_Facilities_2024',
      'Potato Seed Cold Storage Facilities List',
      companySettings,
      'Active Facilities & Capacities'
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 uppercase">
            <Warehouse className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            COLD STORAGE FACILITIES DIRECTORY
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase">
            MANAGE PARTNER COLD STORAGE WAREHOUSES, LEASE CAPACITIES, OCCUPANCY RATES, AND CONTACTS
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          {hasPermission('manage_cold_storage') && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 rounded-xl shadow-xs transition-colors cursor-pointer uppercase"
            >
              <PlusCircle className="w-4 h-4" />
              <span>ADD COLD STORAGE</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer uppercase"
          >
            <Download className="w-4 h-4 text-sky-500" />
            <span>EXPORT EXCEL</span>
          </button>

          <button
            onClick={() => {
              validateAndTriggerPrint({
                data: coldStorages,
                reportTitle: 'COLD STORAGE FACILITIES OVERVIEW',
                companySettings,
                expectedMinRecords: 1,
                databaseCheck: () => {
                  if (coldStorages.length === 0) {
                    return { isConsistent: false, reason: 'No cold storage facilities are defined in the database.' };
                  }
                  for (const cs of coldStorages) {
                    if (!cs.name || cs.capacity <= 0) {
                      return { isConsistent: false, reason: `Facility ${cs.name || 'unnamed'} has invalid capacity specification.` };
                    }
                  }
                  return { isConsistent: true };
                },
                onSuccess: () => {
                  if (addToast) addToast(`Facilities data verified (${coldStorages.length} locations). Opening print dialog...`, 'success');
                },
                onError: (msg) => {
                  if (addToast) addToast(msg, 'error');
                },
              });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer uppercase"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT</span>
          </button>
        </div>
      </div>

      {/* Facilities Cards Grid or Empty State */}
      {coldStorages.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <ColdStorageEmptyState onAddStorage={openAddModal} showNavigateLink={false} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {coldStorages.map((cs) => {
            const totalReceived = stockTransactions
              .filter((s) => s.coldStorageId === cs.id)
              .reduce((acc, s) => acc + s.sackQuantity, 0);

            const totalDelivered = deliveryTransactions
              .filter((d) => d.coldStorageId === cs.id)
              .reduce((acc, d) => acc + d.sackQuantity, 0);

            const remainingBags = Math.max(0, totalReceived - totalDelivered);
            const occupancyRate = cs.capacity > 0 ? (remainingBags / cs.capacity) * 100 : 0;
            const availableBags = Math.max(0, cs.capacity - remainingBags);

            return (
              <div
                key={cs.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-sky-400 dark:hover:border-sky-500 transition-all"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-mono">
                        {cs.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {cs.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 no-print">
                      {hasPermission('manage_cold_storage') && (
                        <button
                          onClick={() => openEditModal(cs)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {hasPermission('manage_cold_storage') && coldStorages.length > 1 && (
                        <button
                          onClick={() => deleteColdStorage(cs.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Location & District */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {cs.location} {cs.district ? `(${cs.district})` : ''}
                    </span>
                  </div>

                  {/* Occupancy Progress */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Occupancy Rate
                      </span>
                      <span
                        className={`font-bold ${
                          occupancyRate > 90
                            ? 'text-rose-600'
                            : occupancyRate > 70
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {occupancyRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          occupancyRate > 90
                            ? 'bg-rose-500'
                            : occupancyRate > 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, occupancyRate)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      <div>
                        <span className="text-slate-400 block uppercase">REMAINING STOCK</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {remainingBags === 0 ? '-' : `${remainingBags.toLocaleString()} Bags`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase">AVAILABLE SPACE</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {availableBags === 0 ? '-' : `${availableBags.toLocaleString()} Bags`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Storage Specifications */}
                  <div className="mt-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 uppercase">LEASED CAPACITY</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {cs.capacity === 0 ? '-' : `${cs.capacity.toLocaleString()} Bags`}
                      </span>
                    </div>
                  </div>

                  {/* Manager Contact */}
                  {(cs.contactPerson || cs.contactPhone) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cs.contactPerson || 'Store Manager'}</span>
                      </div>
                      {cs.contactPhone && (
                        <div className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                          <Phone className="w-3 h-3" />
                          <span>{cs.contactPhone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* View Stock Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 no-print">
                  <button
                    onClick={() => handleViewFacilityStock(cs.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer uppercase"
                  >
                    <Boxes className="w-3.5 h-3.5 text-sky-500" />
                    <span>VIEW POTATO SEND TO COLD STORAGE DETAILS</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingStorage ? 'EDIT COLD STORAGE FACILITY' : 'ADD NEW COLD STORAGE FACILITY'}
          subtitle="Configure storage parameters and leased capacity"
          maxWidth="lg"
        >
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  FACILITY CODE <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS-04"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  DISTRICT / DIVISION
                </label>
                <input
                  type="text"
                  placeholder="e.g. Thakurgaon"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                FACILITY NAME <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Himadri Cold Storage Ltd."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                FULL PHYSICAL ADDRESS / LOCATION <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Birganj, Dinajpur Highway"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                CAPACITY (BAGS) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  CONTACT PERSON
                </label>
                <input
                  type="text"
                  placeholder="e.g. Md. Mostafizur Rahman"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 uppercase">
                  CONTACT PHONE
                </label>
                <input
                  type="text"
                  placeholder="e.g. +880 1711-XXXXXX"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl cursor-pointer uppercase"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs cursor-pointer uppercase"
              >
                {editingStorage ? 'UPDATE FACILITY' : 'SAVE FACILITY'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
