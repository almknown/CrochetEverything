/**
 * Crochet Stitch Constants
 * Geometric properties for each stitch type used in calculations
 */

export type StitchType = 'ch' | 'sc' | 'hdc' | 'dc' | 'inc' | 'dec' | 'sl_st' | 'mr';

export interface StitchProperties {
    name: string;
    abbreviation: StitchType;
    heightRatio: number;  // Relative height (sc = 1.0)
    widthRatio: number;   // Relative width (sc = 1.0)
    description: string;
}

export const STITCH_PROPERTIES: Record<StitchType, StitchProperties> = {
    ch: {
        name: 'Chain',
        abbreviation: 'ch',
        heightRatio: 0.5,
        widthRatio: 1.0,
        description: 'Foundation stitch, creates the starting chain',
    },
    sc: {
        name: 'Single Crochet',
        abbreviation: 'sc',
        heightRatio: 1.0,
        widthRatio: 1.0,
        description: 'Basic stitch, creates a tight, dense fabric',
    },
    hdc: {
        name: 'Half Double Crochet',
        abbreviation: 'hdc',
        heightRatio: 1.5,
        widthRatio: 1.0,
        description: 'Medium height stitch, slightly looser than sc',
    },
    dc: {
        name: 'Double Crochet',
        abbreviation: 'dc',
        heightRatio: 2.0,
        widthRatio: 1.2,
        description: 'Taller stitch, creates a more open fabric',
    },
    inc: {
        name: 'Increase',
        abbreviation: 'inc',
        heightRatio: 1.0,
        widthRatio: 2.0,
        description: '2 stitches in one stitch, expands fabric',
    },
    dec: {
        name: 'Decrease (Invisible)',
        abbreviation: 'dec',
        heightRatio: 1.0,
        widthRatio: 0.5,
        description: 'Combines 2 stitches into 1, contracts fabric',
    },
    sl_st: {
        name: 'Slip Stitch',
        abbreviation: 'sl_st',
        heightRatio: 0.25,
        widthRatio: 1.0,
        description: 'Joining stitch, also used for invisible joins',
    },
    mr: {
        name: 'Magic Ring',
        abbreviation: 'mr',
        heightRatio: 0,
        widthRatio: 0,
        description: 'Adjustable starting ring for working in the round',
    },
};

/**
 * Default starting stitches for different shapes when working in the round
 */
export const ROUND_START_STITCHES: Record<string, number> = {
    circle: 6,      // Standard flat circle
    hexagon: 6,     // Naturally hexagonal shape
    triangle: 3,    // 3-pointed start
    sphere: 6,      // Amigurumi sphere
    oval: 6,        // Modified with chain center
};

/**
 * Increase rate per round for flat shapes
 * Number of stitches added each round to keep the piece flat
 */
export const FLAT_INCREASE_RATE: Record<string, number> = {
    circle: 6,      // Add 6 stitches per round
    hexagon: 6,     // Add 6 stitches per round (same as circle but grouped)
    triangle: 3,    // Add 3 stitches per round
};

/**
 * Stitch abbreviation map for pattern output
 */
export const STITCH_ABBREVIATIONS: Record<string, string> = {
    'chain': 'ch',
    'single crochet': 'sc',
    'half double crochet': 'hdc',
    'double crochet': 'dc',
    'increase': 'inc',
    'decrease': 'dec',
    'slip stitch': 'sl st',
    'magic ring': 'MR',
};
