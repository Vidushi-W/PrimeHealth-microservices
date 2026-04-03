import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle, ChevronRight, ChevronLeft, UserPlus, HeartPulse, ShieldCheck, User } from 'lucide-react';
import './RegistrationForm.css';

const RegistrationForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    dob: '',
    gender: '',
    contactNumber: '',
    bloodGroup: '',
    knownAllergies: '',
    chronicConditions: '',
    registerFor: 'self',
    relationship: '',
    agreeTerms: false
  });

  const [errors, setErrors] = useState({});

  const steps = [
    { title: "Account Info", icon: <UserPlus size={20} /> },
    { title: "Personal Details", icon: <User size={20} /> },
    { title: "Medical History", icon: <HeartPulse size={20} /> },
    { title: "Privacy & Setup", icon: <ShieldCheck size={20} /> }
  ];

  const validateStep = (step) => {
    let stepErrors = {};
    let isValid = true;

    if (step === 1) {
      if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
        stepErrors.email = "Please enter a valid email address.";
        isValid = false;
      }
      if (!formData.password || formData.password.length < 8) {
        stepErrors.password = "Password must be at least 8 characters.";
        isValid = false;
      }
      if (formData.password !== formData.confirmPassword) {
        stepErrors.confirmPassword = "Passwords do not match.";
        isValid = false;
      }
    }

    if (step === 2) {
      if (!formData.fullName.trim()) { stepErrors.fullName = "Full name is required."; isValid = false; }
      if (!formData.dob) { stepErrors.dob = "Date of Birth is required."; isValid = false; }
      if (!formData.gender) { stepErrors.gender = "Please select a gender."; isValid = false; }
      if (!formData.contactNumber || formData.contactNumber.length < 10) { 
        stepErrors.contactNumber = "Please enter a valid contact number."; 
        isValid = false; 
      }
    }

    if (step === 4) {
      if (!formData.agreeTerms) {
        stepErrors.agreeTerms = "You must accept the Health Data Privacy Policy.";
        isValid = false;
      }
      if (formData.registerFor === 'family' && !formData.relationship.trim()) {
        stepErrors.relationship = "Please specify the relationship.";
        isValid = false;
      }
    }

    setErrors(stepErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateStep(4)) {
      setIsSubmitting(true);
      // Simulate API call
      setTimeout(() => {
        setIsSubmitting(false);
        alert("Registration Successful!");
        // Here you would connect to patientController POST /register
      }, 1500);
    }
  };

  return (
    <div className="registration-container">
      <div className="glass-card registration-card">
        
        {/* Header */}
        <div className="header-section">
          <h2>Patient Registration</h2>
          <p>Join PrimeHealth for a healthier tomorrow.</p>
        </div>

        {/* Progress Bar */}
        <div className="stepper">
          {steps.map((step, index) => (
            <div key={index} className={`step ${currentStep > index + 1 ? 'completed' : ''} ${currentStep === index + 1 ? 'active' : ''}`}>
              <div className="step-icon">
                {currentStep > index + 1 ? <CheckCircle size={20} /> : step.icon}
              </div>
              <span className="step-label">{step.title}</span>
              {index < steps.length - 1 && <div className="step-connector"></div>}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="form-content">
          
          {/* STEP 1: Account Info */}
          {currentStep === 1 && (
            <div className="step-pane animate-fade-in">
              <h3>Account Credentials</h3>
              
              <div className="input-group">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="patient@example.com" />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
              
              <div className="input-group password-group">
                <label>Password</label>
                <div className="password-wrapper">
                  <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="Minimum 8 characters" />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

              <div className="input-group">
                <label>Confirm Password</label>
                <input type={showPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm your password" />
                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
              </div>
            </div>
          )}

          {/* STEP 2: Personal Details */}
          {currentStep === 2 && (
            <div className="step-pane animate-fade-in">
              <h3>Personal Identification</h3>
              
              <div className="input-group">
                <label>Full Legal Name</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" />
                {errors.fullName && <span className="error-text">{errors.fullName}</span>}
              </div>
              
              <div className="row-group">
                <div className="input-group half">
                  <label>Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob} onChange={handleChange} />
                  {errors.dob && <span className="error-text">{errors.dob}</span>}
                </div>
                
                <div className="input-group half">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {errors.gender && <span className="error-text">{errors.gender}</span>}
                </div>
              </div>

              <div className="input-group">
                <label>Contact Number</label>
                <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="+1 (555) 000-0000" />
                {errors.contactNumber && <span className="error-text">{errors.contactNumber}</span>}
              </div>
            </div>
          )}

          {/* STEP 3: Medical Baseline */}
          {currentStep === 3 && (
            <div className="step-pane animate-fade-in">
              <h3>Clinical Foundation</h3>
              <p className="subtext">Providing this optional data helps our AI Symptom Checker personalize your risk score.</p>
              
              <div className="input-group">
                <label>Blood Group</label>
                <select name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}>
                  <option value="">Unknown / Prefer not to say</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="input-group">
                <label>Known Allergies</label>
                <input type="text" name="knownAllergies" value={formData.knownAllergies} onChange={handleChange} placeholder="e.g. Penicillin, Peanuts (Comma separated)" />
              </div>

              <div className="input-group">
                <label>Chronic Conditions</label>
                <input type="text" name="chronicConditions" value={formData.chronicConditions} onChange={handleChange} placeholder="e.g. Diabetes, Hypertension" />
              </div>
            </div>
          )}

          {/* STEP 4: Privacy & Setup */}
          {currentStep === 4 && (
            <div className="step-pane animate-fade-in">
              <h3>Final Setup & Privacy</h3>
              
              <div className="profile-selector">
                <label>Who are you registering for?</label>
                <div className="radio-group">
                  <label className={`radio-card ${formData.registerFor === 'self' ? 'selected' : ''}`}>
                    <input type="radio" name="registerFor" value="self" checked={formData.registerFor === 'self'} onChange={handleChange} />
                    Myself
                  </label>
                  <label className={`radio-card ${formData.registerFor === 'family' ? 'selected' : ''}`}>
                    <input type="radio" name="registerFor" value="family" checked={formData.registerFor === 'family'} onChange={handleChange} />
                    A Family Member
                  </label>
                </div>
              </div>

              {formData.registerFor === 'family' && (
                <div className="input-group slide-down">
                  <label>Relationship to Patient</label>
                  <input type="text" name="relationship" value={formData.relationship} onChange={handleChange} placeholder="e.g. Child, Parent, Spouse" />
                  {errors.relationship && <span className="error-text">{errors.relationship}</span>}
                </div>
              )}

              <div className="terms-group">
                <label className="checkbox-container">
                  <input type="checkbox" name="agreeTerms" checked={formData.agreeTerms} onChange={handleChange} />
                  <span className="checkmark"></span>
                  <span className="terms-text">I have read and agree to the <strong>Health Data Privacy Policy</strong> and <strong>Terms of Service</strong>. I consent to my data being processed securely.</span>
                </label>
                {errors.agreeTerms && <span className="error-text">{errors.agreeTerms}</span>}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="form-actions">
            {currentStep > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                <ChevronLeft size={18} /> Back
              </button>
            ) : (
              <div></div> // Spacing placeholder
            )}

            {currentStep < 4 ? (
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                Continue <ChevronRight size={18} />
              </button>
            ) : (
              <button type="submit" className="btn btn-submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating Account..." : "Complete Registration"}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
