import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const AddDonation = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [images, setImages] = useState([]);

    const [formData, setFormData] = useState({
        category: '',
        description: '',
        amount: '',
        pickup_date: '',
        district: '',
        area: '',
        pickup_address: ''
    });

    const districts = [
        "Thiruvananthapuram", "Kollam", "Pathanamthitta", "Alappuzha",
        "Kottayam", "Idukki", "Ernakulam", "Thrissur", "Palakkad",
        "Malappuram", "Kozhikode", "Wayanad", "Kannur", "Kasaragod"
    ];

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.7); // 70% quality
                };
            };
        });
    };

    const handleImageChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const maxImages = 5;
        const availableSlots = maxImages - images.length;
        const selectedFiles = files.slice(0, availableSlots);

        const newImages = await Promise.all(selectedFiles.map(async (file) => {
            const compressedFile = file.size > 1024 * 1024 ? await compressImage(file) : file;
            return {
                file: compressedFile,
                preview: URL.createObjectURL(compressedFile)
            };
        }));

        setImages((prev) => [...prev, ...newImages]);
    };

    const removeImage = (index) => {
        setImages((prev) => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const getAiCategory = async () => {
        if (!formData.description) {
            alert("Please enter a description first.");
            return;
        }
        setAiLoading(true);
        try {
            const response = await api.get(`/ai-category/?description=${encodeURIComponent(formData.description)}`);
            setFormData(prev => ({ ...prev, category: response.data.category }));
        } catch (error) {
            console.error("AI Suggestion failed:", error);
            alert("AI suggestion failed. Please enter category manually.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) data.append(key, formData[key]);
        });

        images.forEach((imgObj) => {
            data.append('images', imgObj.file);
        });

        try {
            await api.post('donations/', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Donation submitted successfully!");
            navigate('/my-donations');
        } catch (error) {
            console.error("Submission failed:", error);
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : "Failed to submit donation.";
            alert("Failed to submit donation: " + errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container py-5">
            <style>{`
                .donation-card {
                    max-width: 700px;
                    margin: 0 auto;
                    padding: 30px;
                    border-radius: 15px;
                    background: #fff;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    color: #333;
                }
                .location-section {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    border-left: 4px solid #0d6efd;
                    margin: 20px 0;
                }
                .preview-img-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                    margin-top: 10px;
                }
                .preview-img {
                    position: relative;
                    width: 80px;
                    height: 80px;
                }
                .preview-img img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 8px;
                }
                .remove-btn {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ff4d4d;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                    cursor: pointer;
                }
            `}</style>

            <div className="donation-card">
                <h2 className="text-center mb-4 text-primary">Add New Donation</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-bold">Description</label>
                        <textarea
                            name="description"
                            className="form-control"
                            rows="3"
                            placeholder="Describe what you want to donate..."
                            value={formData.description}
                            onChange={handleInputChange}
                            required
                        ></textarea>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-info mt-2"
                            onClick={getAiCategory}
                            disabled={aiLoading}
                        >
                            {aiLoading ? "Detecting..." : "✨ Auto-detect Category"}
                        </button>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold">Category</label>
                        <input
                            type="text"
                            name="category"
                            className="form-control"
                            placeholder="e.g. Clothes, Books, Furniture"
                            value={formData.category}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold">Pickup Date</label>
                            <input
                                type="date"
                                name="pickup_date"
                                className="form-control"
                                value={formData.pickup_date}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label fw-bold">Est. Weight/Amount</label>
                            <input
                                type="text"
                                name="amount"
                                className="form-control"
                                placeholder="e.g. 5 kg, 10 items"
                                value={formData.amount}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>

                    <div className="location-section">
                        <h6 className="mb-3">📍 Pickup Location (Kerala Only)</h6>
                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label small">District</label>
                                <select
                                    name="district"
                                    className="form-select"
                                    value={formData.district}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select District</option>
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label small">Area</label>
                                <input
                                    type="text"
                                    name="area"
                                    className="form-control"
                                    placeholder="Locality"
                                    value={formData.area}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="mb-0">
                            <label className="form-label small">Complete Address</label>
                            <textarea
                                name="pickup_address"
                                className="form-control"
                                rows="2"
                                placeholder="House name/number, street..."
                                value={formData.pickup_address}
                                onChange={handleInputChange}
                                required
                            ></textarea>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="form-label fw-bold">Images (Max 5)</label>
                        <input
                            type="file"
                            className="form-control"
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                            disabled={images.length >= 5}
                        />
                        <div className="preview-img-container">
                            {images.map((img, idx) => (
                                <div key={idx} className="preview-img">
                                    <img src={img.preview} alt="preview" />
                                    <button type="button" className="remove-btn" onClick={() => removeImage(idx)}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100 py-2 fw-bold"
                        disabled={submitting}
                    >
                        {submitting ? "Submitting..." : "Submit Donation"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddDonation;
