// Configure the SDK before any service is constructed. This is a side-effect
// import: every module that touches the API goes through this barrel, so the
// baseUrl is always set by the time a service runs.
import './init';

// Re-export everything from the SDK. The chess domain logic — Elo maths, rating
// algorithms, tournament status, prize categories, result codes — lives there
// and is framework-agnostic.
export * from '@msvens/schack-se-sdk';
