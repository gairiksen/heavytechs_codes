module.exports = {
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss-rtl')
  ],

  theme: {
    extend: {
      screens: {
        'xs': '475px'
      },
      colors: {
        page: '#f3f4f6',
        panel: '#fff',
        frame: '#e2e8f0',
        logo: '#4299e1',
        accent: {
          dark: '#1e3173'
        },
        content: {
          DEFAULT: '#374151',
          inverted: '#fff',
          sidenote: '#4a586d',
        },
        interaction: {
          DEFAULT: '#1d4ed8',
          hover: '#3466e3',
          disabled: '#bfdbfe',
        },
        danger: {
          DEFAULT: '#b91c1c',
          hover: '#ca3a31',
          disabled: '#fecaca',
        },
        confirmation: {
          DEFAULT: '#047857',
          hover: '#098f69',
          disabled: '#bbddd3',
        },
        warning: {
          DEFAULT: '#f3b14e',
          hover: '#ffbe5b',
          disabled: '#ffe9c8',
        },
      },

      spacing: {
        10.5: '2.55rem',
        68: '17rem',
        100: '25rem',
      },

      boxShadow: {
        dropdown: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 -7px 10px -5px rgba(0, 0, 0, 0.06)',
      },

      fontSize: {
        '2xs': '.5rem',
      },

      lineHeight: {
        '11': '2.75rem',
      },

      minWidth: {
        '44': '11rem',
        '80': '20rem',
      },

      zIndex: {
        '-10': '-10',
      },
    },

    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1rem',
        lg: '1rem',
        xl: '1rem',
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1432px'
      }
    },
  },
};
