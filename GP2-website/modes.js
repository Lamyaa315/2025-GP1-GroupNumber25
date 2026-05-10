const themeSwitch = document.getElementById('themeSwitch');

// التبديل بين الوضعين بناءً على الـ checkbox
themeSwitch.addEventListener('change', function() {
  if (themeSwitch.checked) {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark'); // حفظ الوضع في الـ localStorage
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light'); // حفظ الوضع في الـ localStorage
  }
});

// استرجاع الوضع من الـ localStorage عند تحميل الصفحة
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
  themeSwitch.checked = true;
} else {
  document.documentElement.setAttribute('data-theme', 'light');
  themeSwitch.checked = false;
}