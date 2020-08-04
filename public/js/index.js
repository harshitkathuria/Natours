//DOM elements..........................
const signupForm = document.querySelector('#signup-form')
const loginForm = document.querySelector('#login-form')
const mapBox = document.querySelector('#map');
const logOutBtn = document.querySelector('.nav__el--logout')
const updateDataFrom = document.querySelector('.form-user-data')
const updatePasswordForm = document.querySelector('.form-user-password')
const bookBtn = document.getElementById('book-tour')
// ...................................................


//STRIPE.......................................

const stripe = Stripe('pk_test_51HC8P8E4CjMWLMqQ7cUMS0ekDzTGUv1v82A62l4TEybzPLBfnqcDFfU8E05Ql3pqO1X5XxcjBA6jYk4Bx8SFe8D700El64yS1P');

const bookTour = async tourId => {
  try {
    //1) Get the checkout session from API
    const session = await axios({
      method: 'GET',
      url: `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    })
    // console.log(session);

    //2) Create a sesison form + charge credit card
    await stripe.redirectToCheckout({
      sessionId:  session.data.session.id
    })
  }
  catch(err) {
    console.log(err);
    showAlert('error', err);
  }
}

if(bookBtn) {
  bookBtn.addEventListener('click', e => {
    e.target.textContent = 'Processing...';
    const tourId = bookBtn.dataset.tourId;
    bookTour(tourId);
  })
}

//..............................................


//SignUp..................................
const signup = async(user) => {
  try {
    const { name, email, password, passwordConfirm } = user;
    // console.log(name, email, password, passwordConfirm);
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm
      }
    })

    if(res.data.status === 'success') {
      showAlert('success', 'Account Created Successfully!');
      window.setTimeout(() => {
        location.assign('/')
      }, 1500);
    }
  }
  catch(err) {
    console.log(err.response.data.message);
    showAlert('error', err.response.data.message);
  }
}

if(signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = {};
    user.name = document.getElementById('name').value;
    user.email = document.getElementById('email').value;
    user.password = document.getElementById('password').value;
    user.passwordConfirm = document.getElementById('passwordConfirm').value;
  
    signup(user);
  })
}
// ...........................


//Log in........................................

//Creating post req
const login = async(email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email,
        password
      }
    });

    if(res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!')
      window.setTimeout(() => {
        location.assign('/')
      }, 1500);
    }
  }
  catch(err) {
    console.log(err.response.data.message);
    showAlert('error', err.response.data.message);
  }
}

//Extracting values from loginForm
if(loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    login(email, password);
  })
}
// .................................

//Log out..............................
const logOut = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout'
    })

    if(res.data.status === 'success')
      location.reload(true);
  }
  catch(err) {
    console.log(err);
    showAlert('error', 'Error logging out...Try Again!')
  }
}

if(logOutBtn) 
  logOutBtn.addEventListener('click', logOut);

// ................................

//Alerts....................................

//Hide Alert
const hideAlert = () => {
  const el = document.querySelector('.alert');
  if(el)
    el.remove();
}

//Alerts for log in and signup
const showAlert = (type, msg) => {

  hideAlert();

  const markup = `<div class='alert alert--${type}'>${msg}</div>`
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);

  window.setTimeout(hideAlert, 5000)
}
// ..............................


//Mapbox...............................................

if(mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  // console.log(locations);
  
  mapboxgl.accessToken = 'pk.eyJ1IjoiaGFyc2hpdC1rYXRodXJpYSIsImEiOiJja2Rjdmd6eXMwb3lzMnNuYmtyamg0bTUzIn0.25Whd4jnNOG-_La3h-DlYQ';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/harshit-kathuria/ckdcvl12n0br51iobupruppvq',
    //Disable zoom
    scrollZoom: false
    // //Center of map
    // center: [-111.65, 134.5],
    // //Zoom level
    // zoom: 4,
    // //Interactivity of map
    // interactive: false
  });
  
  const bounds = new mapboxgl.LngLatBounds();
  
  locations.forEach(location => {
    //Create marker
    const marker = document.createElement('div');
    marker.className = 'marker';
  
    //Add marker
    new mapboxgl.Marker({
      element: marker,
      anchor: 'bottom'
    })
      .setLngLat(location.coordinates)
      .addTo(map);
  
    //Add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(location.coordinates)
      .setHTML(`<p>Day ${location.day} ${location.description}</p>`)
      .addTo(map);
  
    //Extends the map bound to inlcude the current location
    bounds.extend(location.coordinates);
  });
  
  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 200,
      left: 100,
      right: 100
    }
  });
}
// .......................................

//UPDATE SETTINGS

//update user name and email
const updateUserData = async (data) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: 'http://127.0.0.1:3000/api/v1/users/updateMe',
      data
    });
    if(res.data.status === 'success') {
      showAlert('success', 'Data updated successfully!')
      window.setTimeout(() => {
        location.reload(true);
      }, 1500);
    }
  }
  catch(err) {
    console.log(err.response.data.message);
    showAlert('error', err.response.data.message);
  }
}

if(updateDataFrom) {
  updateDataFrom.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);
    updateUserData(form);
  })
}

//update password
const updateUserPassword = async (data) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url: 'http://127.0.0.1:3000/api/v1/users/updateMyPassword',
      data
    });
    if(res.data.status === 'success') {
      showAlert('success', 'Password updated successfully!')
      window.setTimeout(() => {
        location.reload(true);
      }, 1500);
    }
  }
  catch(err) {
    console.log(err.response.data.message);
    showAlert('error', err.response.data.message);
  }
}

if(updatePasswordForm) {
  updatePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.save-password-btn').textContent = 'Updating Password....';
    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    await updateUserPassword({ passwordCurrent, password, passwordConfirm });
    document.querySelector('.save-password-btn').textContent = 'Save Password';
  })
}

//STRIPE...................................