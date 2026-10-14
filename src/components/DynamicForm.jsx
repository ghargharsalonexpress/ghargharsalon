import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    TextField,
    Grid,
    Button,
    Checkbox,
    FormControlLabel,
    Paper,
    MenuItem,
    useTheme,
} from "@mui/material";
import PrivacyPolicyModal from "./PrivacyModal";
import { ErrorMessage, SuccessMessage } from "./Notify";

const DynamicForm = ({ title, subtitle, layout, onSubmit, buttonLabel, externalErrors, success, onReset, serverMessage, sxForBContainer }) => {
    const theme = useTheme();
    const [formData, setFormData] = useState({});
    const [agree, setAgree] = useState(false);
    const [openPolicy, setOpenPolicy] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        layout.forEach((row) =>
            row.fields.forEach((field) => {
                if (field.required && !formData[field.name]?.trim()) {
                    newErrors[field.name] = `${field.label} is required`;
                }
            })
        );
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        onSubmit(formData);
    };

    useEffect(() => {
        if (externalErrors) {
            setErrors(externalErrors);
        }
    }, [externalErrors]);

    if (success === true) {
        return <SuccessMessage onReset={onReset} />;
    }

    if (success === false && serverMessage) {
        return <ErrorMessage onReset={onReset} />;
    }
    return (
        <>
            <Box
                sx={sxForBContainer ? {
                    backgroundColor: theme.palette.background.default,
                    minHeight: "100vh",
                } : {
                    py: 8,
                    px: { xs: 2, md: 8 },
                    backgroundColor: theme.palette.background.default,
                    minHeight: "100vh",
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        maxWidth: 900,
                        mx: "auto",
                        p: { xs: 4, md: 6 },
                        borderRadius: 3,
                        backgroundColor: theme.palette.background.paper,
                        border: '1px solid'
                    }}
                >
                    <Box textAlign="center" mb={4}>
                        <Typography
                            variant="h6"
                            color="secondary"
                            fontWeight={700}
                            mb={1}
                            sx={{ letterSpacing: 0.3 }}
                        >
                            Get in Touch
                        </Typography>

                        <Typography variant="h4" fontWeight={700} color="text.primary" mb={1}>
                            {title}
                        </Typography>

                        {subtitle && (
                            <Typography
                                variant="body1"
                                color="text.secondary"
                                maxWidth={500}
                                mx="auto"
                            >
                                {subtitle}
                            </Typography>
                        )}
                    </Box>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            borderTop: `1px solid ${theme.palette.divider}`,
                            pt: 4,
                        }}
                    >
                        {layout.map((row, idx) => (
                            <React.Fragment key={idx}>
                                {/* Render section heading if provided */}
                                {row.section && (
                                    <Typography
                                        variant="h6"
                                        fontWeight={600}
                                        color="text.primary"
                                        sx={{ mt: idx > 0 ? 4 : 0, mb: 2 }}
                                    >
                                        {row.section}
                                    </Typography>
                                )}

                                <Grid
                                    container
                                    columns={12}
                                    spacing={0}
                                    mb={2}
                                    sx={{
                                        width: "100%",
                                        margin: 0,
                                        display: "flex",
                                        flexWrap: "wrap",
                                    }}
                                >
                                    {row.fields.map((field) => (
                                        <Grid
                                            item
                                            xs={12}
                                            sm={12 / (row.cols || 1)}
                                            key={field.name}
                                            sx={{
                                                flexBasis: `${100 / (row.cols || 1)}%`,
                                                maxWidth: `${100 / (row.cols || 1)}%`,
                                                p: 1,
                                            }}
                                        >
                                            <Box mb={2} width="100%">
                                                {/* Label */}
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={500}
                                                    color="text.secondary"
                                                    mb={0.5}
                                                >
                                                    {field.label}
                                                    {field.required && (
                                                        <Box component="span" color="error.main">
                                                            {" *"}
                                                        </Box>
                                                    )}
                                                </Typography>
                                                <TextField
                                                    fullWidth
                                                    type={field.type}
                                                    select={field.type === "select"}
                                                    name={field.name}
                                                    value={formData[field.name] || ""}
                                                    onChange={handleChange}
                                                    error={!!errors[field.name]}
                                                    helperText={errors[field.name]}
                                                    multiline={field.isTextArea ? true : false}
                                                    minRows={field.isTextArea ? 4 : 1}

                                                    sx={{
                                                        "& .MuiInputBase-input": {
                                                            p: field.isTextArea ? 1.5 : 0.5,
                                                        },
                                                        "& .MuiOutlinedInput-root": {
                                                            borderRadius: 0,
                                                            "& textarea": {
                                                                resize: "vertical",
                                                            },
                                                            "&.Mui-error fieldset": {
                                                                borderColor: theme.palette.error.main,
                                                            },
                                                        },
                                                    }}

                                                    slotProps={{
                                                        input: {
                                                            sx: {
                                                                borderRadius: 0,
                                                                padding: field.isTextArea ? "12px !important" : "0 !important",
                                                            },
                                                        },
                                                    }}
                                                >
                                                    {field.options?.map((opt) => (
                                                        <MenuItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </MenuItem>
                                                    ))}
                                                </TextField>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </React.Fragment>
                        ))}

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={agree}
                                    onChange={(e) => setAgree(e.target.checked)}
                                />
                            }
                            label={
                                <Typography variant="body2" color="text.secondary">
                                    I agree to our{" "}
                                    <Box
                                        component="span"
                                        sx={{
                                            color: theme.palette.primary.main,
                                            textDecoration: "underline",
                                            cursor: "pointer",
                                            fontWeight: 500,
                                        }}
                                        onClick={() => setOpenPolicy(true)}
                                    >
                                        Privacy Policy
                                    </Box>
                                </Typography>
                            }
                            sx={{ mt: 3 }}
                        />

                        <PrivacyPolicyModal open={openPolicy} onClose={() => setOpenPolicy(false)} />

                        <Box textAlign="center" mt={4}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                disabled={!agree}
                                sx={{
                                    borderRadius: "30px",
                                    px: 5,
                                    py: 1.2,
                                }}
                            >
                                {buttonLabel || "Submit"}
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </>
    );
};

export default DynamicForm;
