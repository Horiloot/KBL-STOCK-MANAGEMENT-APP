import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from './Modal';
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Save,
  CheckCircle,
  Upload,
  Trash2,
  Image as ImageIcon,
  Sprout,
  Camera,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUser, companySettings, updateCompanySettings, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'user' | 'company'>('user');
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [department, setDepartment] = useState(currentUser?.department || '');
  const [userAvatar, setUserAvatar] = useState<string | undefined>(currentUser?.avatar);

  // Company logo state
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(companySettings?.logoUrl);
  const [companyName, setCompanyName] = useState(companySettings?.companyName || '');
  const [companyTagline, setCompanyTagline] = useState(companySettings?.companyTagline || companySettings?.tagline || '');

  const [error, setError] = useState('');
  const userPhotoInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setEmail(currentUser.email);
      setPhone(currentUser.phone || '');
      setDepartment(currentUser.department || 'Operations & Cold Storage');
      setUserAvatar(currentUser.avatar);
      setError('');
    }
    if (companySettings) {
      setCompanyLogo(companySettings.logoUrl);
      setCompanyName(companySettings.companyName || '');
      setCompanyTagline(companySettings.companyTagline || companySettings.tagline || '');
    }
  }, [currentUser, companySettings, isOpen]);

  // Handle User Photo File Upload
  const handleUserPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Profile image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUserAvatar(result);
      setError('');
      addToast('Profile picture preview updated. Click "Save Changes" to apply.', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Handle Remove User Photo
  const handleRemoveUserPhoto = () => {
    setUserAvatar(undefined);
    if (userPhotoInputRef.current) userPhotoInputRef.current.value = '';
    addToast('Profile picture marked for removal.', 'info');
  };

  // Handle Company Logo Upload
  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('Company logo size should be less than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCompanyLogo(result);
      setError('');
      addToast('Company logo preview updated. Click "Save Changes" to apply.', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Handle Remove Company Logo
  const handleRemoveCompanyLogo = () => {
    setCompanyLogo(undefined);
    if (companyLogoInputRef.current) companyLogoInputRef.current.value = '';
    addToast('Company logo marked for removal.', 'info');
  };

  // Save All Changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Full Name and Email are required.');
      return;
    }

    // 1. Update User
    updateUser(currentUser.id, {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      department: department.trim() || undefined,
      avatar: userAvatar,
    });

    // 2. Update Company Settings (Logo and Name)
    updateCompanySettings({
      ...companySettings,
      companyName: companyName.trim() || companySettings.companyName,
      companyTagline: companyTagline.trim() || companySettings.companyTagline,
      logoUrl: companyLogo,
    });

    addToast('User profile & company settings updated successfully!', 'success');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="USER PROFILE & COMPANY BRANDING"
      subtitle="Manage your personnel photo, contact info, company logo and brand assets"
      maxWidth="lg"
    >
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('user')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer uppercase ${
            activeTab === 'user'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>USER PROFILE PICTURE</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer uppercase ${
            activeTab === 'company'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>COMPANY LOGO & ASSETS</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* TAB 1: User Profile & Picture */}
        {activeTab === 'user' && (
          <div className="space-y-4">
            {/* User Photo Upload / Remove Section */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                USER PROFILE PICTURE
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Avatar Display */}
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-750 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-200 shadow-sm shrink-0">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-extrabold text-2xl text-sky-600 dark:text-sky-400">
                      {fullName
                        ? fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()
                        : 'U'}
                    </span>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    {/* Hidden file input */}
                    <input
                      ref={userPhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUserPhotoChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => userPhotoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer uppercase shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{userAvatar ? 'CHANGE PICTURE' : 'UPLOAD PICTURE'}</span>
                    </button>

                    {userAvatar && (
                      <button
                        type="button"
                        onClick={handleRemoveUserPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer uppercase shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>REMOVE PICTURE</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Recommended: Square JPG, PNG or WebP image under 2MB. Appears in navigation & printed reports.
                  </p>
                </div>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 uppercase">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 uppercase">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 uppercase">
                    Phone Contact
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 uppercase">
                    Department / Division
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Company Logo & Brand Assets */}
        {activeTab === 'company' && (
          <div className="space-y-4">
            {/* Company Logo Upload / Remove Section */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                OFFICIAL COMPANY LOGO
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Logo Display */}
                <div className="w-24 h-20 rounded-2xl overflow-hidden bg-white border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center p-1 shadow-sm shrink-0">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Company Logo preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 flex items-center justify-center text-white">
                      <Sprout className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    {/* Hidden logo file input */}
                    <input
                      ref={companyLogoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCompanyLogoChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => companyLogoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer uppercase shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{companyLogo ? 'CHANGE COMPANY LOGO' : 'UPLOAD COMPANY LOGO'}</span>
                    </button>

                    {companyLogo && (
                      <button
                        type="button"
                        onClick={handleRemoveCompanyLogo}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer uppercase shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>REMOVE LOGO</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    PNG, JPG, or SVG recommended with transparent background. Appears in Header, Sidebar, Excel, PDF & Print outputs.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Company Name Editing */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 uppercase">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 uppercase">
                  Tagline / Sub-Heading
                </label>
                <input
                  type="text"
                  value={companyTagline}
                  onChange={(e) => setCompanyTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer uppercase"
          >
            CANCEL
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors cursor-pointer uppercase"
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE CHANGES</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
