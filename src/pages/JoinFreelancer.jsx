import React from "react";
import DynamicForm from "../components/DynamicForm";
import { useProfessionalFormSubmit } from "../hooks/useProfessionalFormSubmit";

export const professionalFormLayout = [
  {
    section: "Personal Details",
    cols: 2,
    fields: [
      { name: "firstName", label: "First Name", type: "text", required: true },
      { name: "lastName", label: "Last Name", type: "text", required: true },
      {
        name: "gender", label: "Gender", type: "select", required: true, options: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
          { label: "Other", value: "other" },
        ]
      },
      { name: "dob", label: "Date of Birth", type: "date", required: true },
      { name: "phone", label: "Phone Number", type: "number", required: true },
      { name: "email", label: "Email Address", type: "email", required: true },
    ],
  },

  {
    section: "Professional Details",
    cols: 2,
    fields: [
      {
        name: "category",
        label: "Primary Service Category",
        type: "select",
        required: true,
        options: [
          { label: "Salon", value: "salon" },
          { label: "Spa", value: "spa" },
          { label: "Makeup Artist", value: "makeup" },
          { label: "Massage Therapist", value: "massage" },
          { label: "Hair Stylist", value: "hair" },
          { label: "Nail Artist", value: "nail" },
        ],
      },
      {
        name: "experience",
        label: "Years of Experience",
        type: "number",
        required: true,
      },
      {
        name: "certification",
        label: "Professional Certification (if any)",
        type: "text",
      },
      {
        name: "skills",
        label: "Specialized Skills",
        type: "textarea",
        placeholder: "E.g. Bridal Makeup, Hair Styling, Pedicure, etc.",
      },
    ],
  },

  {
    section: "Location Details",
    cols: 3,
    fields: [
      { name: "city", label: "City", type: "text", required: true, default: "Faridabad" },
      { name: "locality", label: "Locality / Area", type: "text", required: true },
      { name: "pincode", label: "Pincode", type: "number", required: true },
      { name: "state", label: "State", type: "text", default: "Haryana" },
      { name: "address", label: "Full Address", type: "textarea", required: true },
    ],
  },

  {
    section: "Business Details",
    cols: 2,
    fields: [
      {
        name: "businessName",
        label: "Salon / Business Name",
        type: "text",
        required: true,
      },
      {
        name: "businessType",
        label: "Business Type",
        type: "select",
        required: true,
        options: [
          { label: "Individual Freelancer", value: "freelancer" },
          { label: "Salon Owner", value: "salon" },
          { label: "Agency", value: "agency" },
        ],
      },
      {
        name: "gstNumber",
        label: "GST / Business Registration Number",
        type: "text",
      },
      {
        name: "serviceRadius",
        label: "Serviceable Area Radius (in km)",
        type: "number",
        placeholder: "E.g. 10 km",
      },
    ],
  },
  {
    section: "Verification Documents",
    cols: 2,
    fields: [
      { name: "idProof", label: "Upload ID Proof (Aadhaar / PAN)", type: "file", required: true },
      { name: "profilePhoto", label: "Upload Profile Picture", type: "file", required: true },
      { name: "workSamples", label: "Upload Work Samples", type: "file", multiple: true },
    ],
  },

  {
    section: "Other Information",
    cols: 1,
    fields: [
      {
        name: "availability",
        label: "Availability",
        type: "select",
        options: [
          { label: "Full Time", value: "full-time" },
          { label: "Part Time", value: "part-time" },
        ],
      },
      {
        name: "bio",
        label: "Short Bio / Introduction",
        type: "textarea",
        placeholder: "Tell us about your work, experience, and passion.",
      },
    ],
  },
];


const JoinFreelancer = () => {
  const { loading, success, errors, handleSubmit } = useProfessionalFormSubmit();
  if (success) return <SuccessScreen />;
  if (loading) return <Loader />;
  return (
    <DynamicForm
      title="Add Your Address Details"
      subtitle="Please provide your contact and address information to confirm your home salon booking."
      layout={professionalFormLayout}
      buttonLabel="Confirm Booking"
      onSubmit={handleSubmit} />
  );
};

export default JoinFreelancer;
