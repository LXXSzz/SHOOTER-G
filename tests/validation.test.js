// Tests básicos para el sistema de validación
const {
    validateUsername,
    validatePassword,
    validateScore,
    validateAvatarId,
    ValidationError
} = require('../utils/validation');

// Mock de config para tests
jest.mock('../config', () => ({
    validation: {
        username: {
            minLength: 3,
            maxLength: 20,
            pattern: /^[a-zA-Z0-9_]+$/
        },
        password: {
            minLength: 4,
            maxLength: 100
        },
        score: {
            min: 0,
            max: 999999
        }
    }
}));

describe('Validation Tests', () => {
    describe('validateUsername', () => {
        test('should accept valid username', () => {
            expect(validateUsername('testuser')).toBe('testuser');
            expect(validateUsername('user123')).toBe('user123');
            expect(validateUsername('test_user')).toBe('test_user');
        });

        test('should reject empty username', () => {
            expect(() => validateUsername('')).toThrow(ValidationError);
            expect(() => validateUsername('   ')).toThrow(ValidationError);
        });

        test('should reject short username', () => {
            expect(() => validateUsername('ab')).toThrow(ValidationError);
        });

        test('should reject long username', () => {
            expect(() => validateUsername('a'.repeat(21))).toThrow(ValidationError);
        });

        test('should reject invalid characters', () => {
            expect(() => validateUsername('test-user')).toThrow(ValidationError);
            expect(() => validateUsername('test@user')).toThrow(ValidationError);
        });
    });

    describe('validatePassword', () => {
        test('should accept valid password', () => {
            expect(validatePassword('password123')).toBe('password123');
            expect(validatePassword('1234')).toBe('1234');
        });

        test('should reject empty password', () => {
            expect(() => validatePassword('')).toThrow(ValidationError);
            expect(() => validatePassword(null)).toThrow(ValidationError);
        });

        test('should reject short password', () => {
            expect(() => validatePassword('123')).toThrow(ValidationError);
        });
    });

    describe('validateScore', () => {
        test('should accept valid score', () => {
            expect(validateScore(100)).toBe(100);
            expect(validateScore(0)).toBe(0);
            expect(validateScore(999999)).toBe(999999);
        });

        test('should reject negative score', () => {
            expect(() => validateScore(-1)).toThrow(ValidationError);
        });

        test('should reject too high score', () => {
            expect(() => validateScore(1000000)).toThrow(ValidationError);
        });

        test('should reject non-numeric score', () => {
            expect(() => validateScore('abc')).toThrow(ValidationError);
        });
    });

    describe('validateAvatarId', () => {
        test('should accept valid avatar IDs', () => {
            expect(validateAvatarId(1)).toBe(1);
            expect(validateAvatarId(2)).toBe(2);
            expect(validateAvatarId(3)).toBe(3);
        });

        test('should reject invalid avatar IDs', () => {
            expect(() => validateAvatarId(0)).toThrow(ValidationError);
            expect(() => validateAvatarId(4)).toThrow(ValidationError);
            expect(() => validateAvatarId('abc')).toThrow(ValidationError);
        });
    });
});

