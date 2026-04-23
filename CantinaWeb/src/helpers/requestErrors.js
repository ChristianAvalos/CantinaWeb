export const isUnauthorizedError = (error) => {
    const status = error?.response?.status;

    return status === 401 || status === 419;
};

export const isConnectionError = (error) => {
    if (!error) {
        return false;
    }

    if (!error.response) {
        return true;
    }

    const status = error.response.status;

    return status >= 500 && status < 600;
};

export const getErrorMessages = (error, fallbackMessage) => {
    const errorBag = error?.response?.data?.errors;

    if (Array.isArray(errorBag) && errorBag.length > 0) {
        return errorBag;
    }

    if (errorBag && typeof errorBag === 'object') {
        const messages = Object.values(errorBag).flat().filter(Boolean);

        if (messages.length > 0) {
            return messages;
        }
    }

    if (error?.response?.data?.message) {
        return [error.response.data.message];
    }

    return [fallbackMessage];
};