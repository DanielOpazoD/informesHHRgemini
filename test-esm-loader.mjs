import path from 'node:path';

export async function resolve(specifier, context, defaultResolve) {
    try {
        return await defaultResolve(specifier, context, defaultResolve);
    } catch (error) {
        if (
            error &&
            typeof specifier === 'string' &&
            specifier.startsWith('.') &&
            !path.extname(specifier)
        ) {
            const amended = `${specifier}.js`;
            return defaultResolve(amended, context, defaultResolve);
        }
        throw error;
    }
}
