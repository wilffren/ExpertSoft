// validators/customerValidator.js
const Joi = require('joi');

const customerSchema = Joi.object({
    name_customer: Joi.string()
        .trim()
        .min(2)
        .max(255)
        .required()
        .messages({
            'string.empty': 'Customer name is required',
            'string.min': 'Customer name must be at least 2 characters long',
            'string.max': 'Customer name cannot exceed 255 characters',
            'any.required': 'Customer name is required'
        }),
    
    identification_number: Joi.string()
        .trim()
        .pattern(/^[0-9]+$/)
        .min(6)
        .max(20)
        .required()
        .messages({
            'string.empty': 'Identification number is required',
            'string.pattern.base': 'Identification number must contain only numbers',
            'string.min': 'Identification number must be at least 6 digits long',
            'string.max': 'Identification number cannot exceed 20 digits',
            'any.required': 'Identification number is required'
        }),
    
    address: Joi.string()
        .trim()
        .min(5)
        .max(255)
        .required()
        .messages({
            'string.empty': 'Address is required',
            'string.min': 'Address must be at least 5 characters long',
            'string.max': 'Address cannot exceed 255 characters',
            'any.required': 'Address is required'
        }),
    
    phone: Joi.string()
        .trim()
        .pattern(/^[\d\s\+\-\(\)]+$/)
        .min(7)
        .max(20)
        .required()
        .messages({
            'string.empty': 'Phone number is required',
            'string.pattern.base': 'Phone number format is invalid',
            'string.min': 'Phone number must be at least 7 digits long',
            'string.max': 'Phone number cannot exceed 20 characters',
            'any.required': 'Phone number is required'
        }),
    
    email: Joi.string()
        .trim()
        .email()
        .max(255)
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Email format is invalid',
            'string.max': 'Email cannot exceed 255 characters',
            'any.required': 'Email is required'
        }),
    
    id_invoice_int: Joi.number()
        .integer()
        .positive()
        .optional()
        .allow(null)
        .messages({
            'number.base': 'Invoice ID must be a number',
            'number.integer': 'Invoice ID must be an integer',
            'number.positive': 'Invoice ID must be positive'
        })
});

function validateCustomer(data) {
    return customerSchema.validate(data, { 
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
    });
}

module.exports = {
    validateCustomer,
    customerSchema
};