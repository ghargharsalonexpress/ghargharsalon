import * as Yup from "yup";
import axios from "axios";
import { useState } from "react";

// ✅ Validation schema
const professionalSchema = Yup.object().shape({
  firstName: Yup.string().required("First Name is required."),
  lastName: Yup.string().required("Last Name is required."),
  gender: Yup.string().required("Please select your gender."),
  dob: Yup.date().required("Date of Birth is required."),
  phone: Yup.string()
    .matches(/^[0-9]{10}$/, "Enter a valid 10-digit phone number.")
    .required("Phone number is required."),
  email: Yup.string().email("Enter a valid email").required("Email is required."),
  category: Yup.string().required("Please select a category."),
  experience: Yup.number()
    .typeError("Experience must be a number.")
    .min(0, "Experience cannot be negative.")
    .required("Experience is required."),
  city: Yup.string().required("City is required."),
  locality: Yup.string().required("Locality is required."),
  pincode: Yup.string()
    .matches(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode.")
    .required("Pincode is required."),
  state: Yup.string().required("State is required."),
  address: Yup.string().required("Full Address is required."),
  businessName: Yup.string().required("Business Name is required."),
  businessType: Yup.string().required("Business Type is required."),
});

// ✅ Hook-style submit handler
export const useProfessionalFormSubmit = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);
      setErrors({});
      setSuccess(false);

      // ✅ Validate locally
      await professionalSchema.validate(formData, { abortEarly: false });

      // ✅ Simulate / send API request
      const response = await axios.post("/api/freelancers/register", formData);

      console.log("✅ Submission successful:", response.data);
      setSuccess(true);
    } catch (err) {
      if (err.name === "ValidationError") {
        // Convert Yup errors into { fieldName: message } format
        const formattedErrors = {};
        err.inner.forEach((e) => (formattedErrors[e.path] = e.message));
        setErrors(formattedErrors);
      } else {
        console.error("❌ Error submitting form:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, success, errors, handleSubmit };
};
