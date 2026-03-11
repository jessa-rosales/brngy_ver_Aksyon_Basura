import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop'; 
import { getCroppedImg } from '../utils/cropImage'; 
import { 
  X, Megaphone, Type, AlignLeft, Tag, AlertCircle, 
  Upload, ImagePlus, CheckCircle2, ChevronDown,
  Calendar, ShieldAlert, Wrench, Info, Trash2, Maximize
} from 'lucide-react';

const CreateAnnouncementModal = ({ isOpen, onClose, onCreate, editData }) => {
  const initialFormState = {
    title: '',
    content: '',
    category: 'Information',
    priority: 'Medium',
    status: 'Published',
    ann_photo: null
  };

  const [formData, setFormData] = useState(initialFormState);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  
  const [image, setImage] = useState(null); 
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  const fileInputRef = useRef(null);

  // ✅ PRE-FILL LOGIC
  useEffect(() => {
    if (editData && isOpen) {
      setFormData({
        title: editData.title || '',
        content: editData.content || '',
        category: editData.category || 'Information',
        priority: editData.priority || 'Medium',
        status: editData.status || 'Published',
        ann_photo: editData.ann_photo 
      });
      if (editData.ann_photo) {
        setPreviewUrl(`https://brngy-nzrth.onrender.com${editData.ann_photo}`);
      }
    } else if (!editData && isOpen) {
      setFormData(initialFormState);
      setPreviewUrl(null);
      setImage(null);
    }
  }, [editData, isOpen]);

  const onCropComplete = useCallback((activeArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeDropdown]);

  if (!isOpen) return null;

  const hasChanges = formData.title !== '' || formData.content !== '' || (previewUrl !== null && !editData);

  const handleFinalClose = () => {
    setFormData(initialFormState);
    setPreviewUrl(null);
    setImage(null);
    setShowConfirmDiscard(false);
    setIsCropping(false);
    onClose();
  };

  const handleDiscardClick = () => {
    if (hasChanges && !editData) setShowConfirmDiscard(true);
    else handleFinalClose();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setImage(reader.result);
        setIsCropping(true); 
      };
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation(); 
    setFormData({ ...formData, ann_photo: null });
    setPreviewUrl(null);
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReCrop = (e) => {
    e.stopPropagation(); 
    setIsCropping(true);
  };

  const saveCroppedImage = async () => {
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      const file = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
      setFormData({ ...formData, ann_photo: file });
      setPreviewUrl(URL.createObjectURL(croppedBlob));
      setIsCropping(false);
    } catch (e) {
      console.error("Crop error:", e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(formData);
    handleFinalClose();
  };

  const categories = [
    { label: 'Schedule', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Emergency', icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Maintenance', icon: Wrench, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Information', icon: Info, color: 'text-green-500', bg: 'bg-green-50' },
  ];

  const priorities = [
    { label: 'Low', color: 'text-gray-400', dot: 'bg-gray-400' },
    { label: 'Medium', color: 'text-blue-500', dot: 'bg-blue-500' },
    { label: 'High', color: 'text-orange-500', dot: 'bg-orange-500' },
    { label: 'Urgent', color: 'text-red-600', dot: 'bg-red-600' },
  ];

  const labelStyle = "flex items-center gap-2 text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-widest";
  const inputBaseStyle = "w-full px-5 py-3.5 rounded-2xl border border-gray-200 outline-none transition-all text-sm bg-white shadow-sm font-medium";

  return (
    <div className="fixed inset-0 z-6000 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[1px] animate-in fade-in duration-300" onClick={handleDiscardClick} />
      
      <div className="bg-[#F8FAFC] w-full max-w-3xl rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        
        <div className="bg-green-600 p-8 text-white py-3 px-8 flex justify-between items-center relative shadow-xl shrink-0">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md border border-white/20">
              <Megaphone size={28} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-2xl leading-tight tracking-tight">
                {editData ? "Modify Announcement" : "Create Announcement"}
              </h3>
              <p className="text-green-100 text-sm font-medium opacity-90">
                {editData ? "Updating existing records" : "Post a new update for the community"}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleDiscardClick} className="p-2.5 hover:bg-white/10 rounded-xl transition-all cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto custom-scrollbar space-y-8">
          <div className="group shrink-0">
            <label className={labelStyle}><ImagePlus size={14} /> Cover Photo (16:9)</label>
            <div 
              onClick={() => !previewUrl && fileInputRef.current.click()}
              className={`relative w-full rounded-4xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden shrink-0
                ${previewUrl ? 'border-green-500 bg-white ring-4 ring-green-500/5 cursor-default' : 'border-gray-200 bg-white hover:border-green-400 hover:shadow-md cursor-pointer'}`}
              style={{ aspectRatio: '16 / 9' }} 
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
                    <button type="button" onClick={handleReCrop} className="p-4 bg-white/20 hover:bg-white/40 rounded-2xl text-white transition-all transform hover:scale-110 flex flex-col items-center gap-1"><Maximize size={20} /><span className="text-[10px] font-bold uppercase tracking-tighter">Adjust</span></button>
                    <button type="button" onClick={handleRemoveImage} className="p-4 bg-red-500/20 hover:bg-red-500/60 rounded-2xl text-white transition-all transform hover:scale-110 flex flex-col items-center gap-1"><Trash2 size={20} /><span className="text-[10px] font-bold uppercase tracking-tighter">Remove</span></button>
                  </div>
                </>
              ) : (
                <div className="text-center p-6">
                  <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:bg-green-50 transition-all duration-300"><Upload size={22} className="text-gray-400 group-hover:text-green-600" /></div>
                  <p className="text-sm font-bold text-gray-600">Click to upload banner</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">JPG or PNG (Max 5MB)</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="space-y-6">
            <div>
              <label className={labelStyle}><Type size={14} /> Announcement Title</label>
              <input type="text" required placeholder="Enter headline..." className={`${inputBaseStyle} focus:border-green-500 focus:ring-4 focus:ring-green-500/10`} value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className={labelStyle}><AlignLeft size={14} /> Description / Details</label>
              <textarea required rows="5" placeholder="Details..." className={`${inputBaseStyle} resize-none leading-relaxed focus:border-green-500 focus:ring-4 focus:ring-green-500/10`} value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="relative">
                <label className={labelStyle}><Tag size={14} /> Category</label>
                <div onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'category' ? null : 'category'); }} className={`${inputBaseStyle} flex items-center justify-between cursor-pointer hover:border-green-400`}>
                  <span className="flex items-center gap-3">{(() => { const cat = categories.find(c => c.label === formData.category) || categories[3]; return <><cat.icon size={18} className={cat.color} /> {cat.label}</>; })()}</span>
                  <ChevronDown size={18} />
                </div>
                {activeDropdown === 'category' && (
                  <div className="absolute top-[110%] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2">
                    {categories.map((cat) => (
                      <div key={cat.label} onClick={() => setFormData({...formData, category: cat.label})} className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 cursor-pointer text-sm font-semibold"><div className={`p-1.5 rounded-lg ${cat.bg}`}><cat.icon size={16} className={cat.color} /></div>{cat.label}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className={labelStyle}><AlertCircle size={14} /> Priority</label>
                <div onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'priority' ? null : 'priority'); }} className={`${inputBaseStyle} flex items-center justify-between cursor-pointer`}>
                  <span className="flex items-center gap-3"><div className={`w-2.5 h-2.5 rounded-full ${(priorities.find(p => p.label === formData.priority) || priorities[1]).dot}`} />{formData.priority}</span>
                  <ChevronDown size={18} />
                </div>
                {activeDropdown === 'priority' && (
                  <div className="absolute top-[110%] left-0 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 py-2">
                    {priorities.map((p) => (
                      <div key={p.label} onClick={() => setFormData({...formData, priority: p.label})} className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 cursor-pointer text-sm font-semibold"><div className={`w-3 h-3 rounded-full ${p.dot}`} />{p.label}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-200/60">
            <button type="button" onClick={handleDiscardClick} className="flex-1 py-4 bg-white border border-gray-200 text-gray-500 font-bold rounded-2xl transition-all active:scale-95 text-sm uppercase tracking-widest hover:bg-red-700 hover:text-white shadow-sm">Discard</button>
            <button type="submit" className="flex-[1.5] py-4 bg-green-600 text-white font-bold rounded-2xl shadow-xl shadow-green-200 hover:bg-green-700 transition-all active:scale-95 text-sm flex items-center justify-center gap-3 uppercase tracking-widest">
              <CheckCircle2 size={20} /> {editData ? "Update Changes" : "Publish Now"}
            </button>
          </div>
        </form>

        {isCropping && image && (
          <div className="absolute inset-0 z-7000 bg-gray-900 flex flex-col h-full w-full overflow-hidden">
            <div className="bg-white/10 p-6 flex justify-between items-center text-white border-b border-white/10 shrink-0">
                <div><h4 className="font-bold flex items-center gap-2"><Maximize size={18} /> Crop Your Banner</h4><p className="text-[10px] uppercase tracking-widest opacity-60">Adjust selection for 16:9 ratio</p></div>
                <button type="button" onClick={() => setIsCropping(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X /></button>
            </div>
            <div className="relative flex-1 bg-black"><Cropper image={image} crop={crop} zoom={zoom} aspect={16 / 9} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} /></div>
            <div className="p-8 bg-white flex flex-col gap-6 shrink-0 shadow-2xl">
              <div className="flex items-center gap-6"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Zoom Level</span><input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-green-600" /></div>
              <div className="flex gap-4"><button type="button" onClick={() => setIsCropping(false)} className="flex-1 py-4 text-gray-500 font-bold border border-gray-200 rounded-2xl text-xs uppercase tracking-widest">Cancel</button><button type="button" onClick={saveCroppedImage} className="flex-2 py-4 bg-green-600 text-white font-bold rounded-2xl shadow-xl text-xs uppercase tracking-widest">Save Selection</button></div>
            </div>
          </div>
        )}

        {showConfirmDiscard && (
          <div className="absolute inset-0 z-8000 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-[0.9px]">
            <div className="bg-white rounded-4xl p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} className="text-red-600" /></div>
              <h4 className="text-xl font-black text-gray-800 mb-2">Discard Changes?</h4>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">Your unsaved work will be lost permanently.</p>
              <div className="flex gap-3"><button onClick={() => setShowConfirmDiscard(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl text-sm">Keep Editing</button><button onClick={handleFinalClose} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg text-sm">Yes, Discard</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAnnouncementModal;