
import { styled, Tooltip, TooltipProps } from "@mui/material";
import React from "react";

const ArrowedTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
    "& .MuiTooltip-arrow": {
        color: theme.palette.common.white,
    },
    "& .MuiTooltip-tooltip": {
        backgroundColor: theme.palette.common.white,
        color: theme.palette.common.black,
    },
}));

// Function for unit conversion in a given input string
export const unitConversion  = (input: string): string => {
  
  // Define a multiplier object for unit conversions
  const multiplier: { [key: string]: number } = {
        'k': 1000,
        'M': 1000000,
        'm': 0.001,
          'K': 1000,
      };
  
      const values = input.split(',');  // Split input string by commas to handle multiple values

      // Map over each value to perform unit conversion
      const convertedValues = values.map((value) => {

        /*
          Regular expression to match and capture components of a value:
          - (-?): Captures an optional negative sign.
          - (\d*\.?\d+): Captures the numeric part of the value, which may include digits, an optional decimal point,
                         and 
          - ([kKmM]?): Captures the unit part of the value, which may be 'k', 'K', 'm', or 'M', and is optional.
          - $: Asserts the end of the string, ensuring the match occurs at the end of the value.
          The result is stored in the 'match' variable, containing an array with the full matched value,
        */
        const match = value.match(/(-?)(\d*\.?\d+)([kKmM]?)$/);
        
        // Check if a match is found
        if (match) {

          // Extract negative sign, numeric value, and unit from the match
          const negativeSign = match[1] || '';
          const numericValue = parseFloat(negativeSign + match[2]);
          const unit = match[3] || '';

          // Check if the unit is present in the multiplier object
          // eslint-disable-next-line no-prototype-builtins
          if (multiplier.hasOwnProperty(unit)) {

            // Perform unit conversion and return the result as a string
            const result = numericValue * multiplier[unit]; 
            return result.toString();

          } else {

            // If unit not found, return the numeric value as a string
            return numericValue.toString();

          }
        }
    
        // Return the original value if it doesn't match the expected format
        return value;
      });
    return convertedValues.join(','); // Join the converted values back into a comma-separated string and return
};

export default ArrowedTooltip;
