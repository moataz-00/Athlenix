'use strict';

const { body, query, param, validationResult } = require('express-validator');
const winston = require('winston');

const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|DELETE|UPDATE|DROP|UNION|ALTER|EXEC|INTO|FROM|WHERE)\b)/gi,
    /(--|#|\/\*|\*\/|;)/g,
    /\b(OR|AND)\b.*\b(=|<|>|LIKE|IN)\b/gi,
    /(\b(AND|OR)\b.*?(\b(SELECT|INSERT|DELETE|UPDATE|DROP|UNION|ALTER|EXEC|INTO|FROM|WHERE)\b))/gi
];

// Initialize logger
const logger = winston.createLogger({
    level: 'warn',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'sqlInjection.log' })
    ]
});

// Detect SQL Injection Attempts
exports.detectSQLInjection = (req, res, next) => {
    const inputData = JSON.stringify(req.body) + JSON.stringify(req.query) + JSON.stringify(req.params);

    if (sqlInjectionPatterns.some((pattern) => pattern.test(inputData))) {
        console.warn('Potential SQL Injection Attempt:', inputData);
        return res.status(400).json({ error: 'Invalid input sql.' });
    }
    next();
};

