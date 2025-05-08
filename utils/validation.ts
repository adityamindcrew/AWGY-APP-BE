export const validateName = (name?: string): string | null => {
    if (!name) return "Please enter your name"
    if (!/^[a-zA-Z\s]+$/.test(name)) return "Name must only contain letters and spaces"
    if (name.length > 25) return "Name cannot exceed 25 characters"
    return null
}


export const validateEmail = (email?: string): string | null => {
    if (!email) return "Please enter your email"
    if (!/\S+@\S+\.\S+/.test(email)) return "Please provide a valid email address"
    return null
}


export const validatePassword = (password?: string): string | null => {
    if (!password) return "Please enter your password"
    if (password.length < 8) return "Password must be at least 8 characters long"
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) return "Password must contain at least one letter and one number"
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return "Password must include at least one special character"
    return null
}

export const validateAddress = (address?: string): string | null => {
    if (!address) return "Please enter your address"
    if (address.length > 50) return "Address cannot exceed 50 characters"
    return null
}

export const validateStreet = (street?: string): string | null => {
    if (!street) return "Please enter your street"
    if (!/^[a-zA-Z\s]+$/.test(street)) return "Street must only contain letters and spaces"
    if (street.length > 50) return "Street cannot exceed 50 characters"
    return null
}

export const validateCity = (city?: string): string | null => {
    if (!city) return "Please enter your city"
    if (!/^[a-zA-Z\s]+$/.test(city)) return "City must only contain letters and spaces"
    if (city.length > 50) return "City cannot exceed 50 characters"
    return null
}

export const validatePostalCode = (postalCode?: string): string | null => {
    if (!postalCode) return "Please enter your postal code"
    if (!/^\d{6}$/.test(postalCode)) return "Postal code must be exactly 6 digits"
    return null
}

export const validateRegistration = (data: {
    email?: string
    password?: string
    name?: string
    address?: string
    street?: string
    city?: string
    postalCode?: string
}): string | null => {
    const { email, password, name, address, street, city, postalCode } = data
    return (
        validateName(name) ||
        validateEmail(email) ||
        validatePassword(password) ||
        validateAddress(address) ||
        validateStreet(street) ||
        validateCity(city) ||
        validatePostalCode(postalCode)
    )
}

export const validateLogin = (data: {
    email?: string
    password?: string
}): string | null => {
    const { email, password } = data
    return validateEmail(email) || validatePassword(password)
}
