import DynamicForm from "../components/DynamicForm";

const FreelancerSignup = () => {
  const layout = [
    {

      cols: 2,
      fields: [
        { name: "firstName", label: "First Name", type: "text" },
        { name: "lastName", label: "Last Name", type: "text" },
      ],
    },
    {
      cols: 2,
      fields: [
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone Number", type: "text" },
      ],
    },
    {
      cols: 3,
      fields: [
        { name: "shopName", label: "Shop Name", type: "text" },
        {
          name: "category",
          label: "Category",
          type: "select",
          options: [
            { label: "Salon", value: "salon" },
            { label: "Spa", value: "spa" },
            { label: "Makeup Artist", value: "makeup" },
          ],
        },
        { name: "city", label: "City", type: "text" },
      ],
    },
    {
      cols: 1,
      fields: [{ name: "bio", label: "Description", type: "textarea" }],
    },
  ];

  return (
    <DynamicForm
      title="Join as a Freelancer"
      subtitle="Provide your details and become part of our professional network."
      layout={layout}
      buttonLabel="Submit Application"
      onSubmit={(data) => console.log("Freelancer form submitted:", data)}
      success={success}
      onReset={() => window.location.reload()}
    />
  );
};

export default FreelancerSignup;
