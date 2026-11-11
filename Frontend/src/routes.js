import React from 'react';
import { Icon } from '@chakra-ui/react';
import {
  MdBarChart,
  MdPerson,
  MdLock,
  MdOutlineShoppingCart,
  MdHome,
  MdPayment,
  MdAttachMoney,
  MdReceiptLong,
  MdWaterDrop,
  MdElectricalServices,
  MdSell,
  MdPeople,
  MdExplore,
  MdLocationCity,
} from 'react-icons/md';

// Admin Imports
import NFTMarketplace from 'views/admin/marketplace';
import Profile from 'views/admin/profile';
import UserProfile from 'views/user/profile';
import Contributions from 'views/admin/contributions';
import UserContribution from 'views/user/contribution';
import FeeUnitList from "views/admin/feeUnit/FeeUnitList";
import FeeUnitForm from "views/admin/feeUnit/FeeUnitForm";
// import BatchBillCreation from "views/admin/utilities/BatchBillCreation";
import UtilityBillsCreation from "views/admin/utilities/UtilityBillsCreation";
import Bill from "views/admin/bill";

// User Imports (if there are differences in the future)
import UserPay from 'views/user/payment';
// Auth Imports
import SignInCentered from 'views/auth/signIn';
import SignUpCentered from 'views/auth/signUp';
import VerifySignUpCentered from 'views/auth/verify';
import ForgotSignUpCentered from 'views/auth/forgotPassword';
import VerifyForgotSignUpCentered from 'views/auth/verifyForgot';
import AdminApartment from 'views/admin/apartment';
import UserTable from 'views/admin/user';
import UserHomePage from 'views/user/homepage';
import AdminHomePage from 'views/admin/homepage';
// Admin routes
export const adminRoutes = [
  {
    name: 'Admin Main Dashboard',
    layout: '/admin',
    path: '/data-tables',
    icon: (
      <Icon
        as={MdLocationCity}
        width="20px"
        height="20px"
        color="inherit"
      />
    ),
    component: <AdminHomePage />,
    secondary: true,
  },
  {
    name: 'Profile',
    layout: '/admin',
    path: '/profile',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <Profile />,
  },
  {
    name: 'Apartment Management',
    layout: '/admin',
    path: '/apartment',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: <AdminApartment />,
  },
  {
    name: 'Resident Management',
    layout: '/admin',
    path: '/resident',
    icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
    component: <UserTable />,
  },
  {
    name: 'Bill Management',
    layout: '/admin',
    path: '/bill',
    icon: <Icon as={MdReceiptLong} width="20px" height="20px" color="inherit" />,
    component: <Bill />,
  },
  {
    name: 'Contributions Management',
    layout: '/admin',
    path: '/contributions',
    icon: <Icon as={MdAttachMoney} width="20px" height="20px" color="inherit" />,
    component: <Contributions />,
  },
  {
    name: 'Fee Unit Management',
    layout: '/admin',
    path: '/fee-units',
    icon: <Icon as={MdSell} width="20px" height="20px" color="inherit" />,
    component: <FeeUnitForm />,
  },
  // {
  //   name: 'Batch Utility Bills',
  //   layout: '/admin',
  //   path: '/batch-bills',
  //   icon: <Icon as={MdWaterDrop} width="20px" height="20px" color="inherit" />,
  //   component: <BatchBillCreation />,
  // },
  {
    name: 'Utility Bills Creation',
    layout: '/admin',
    path: '/utility-bills',
    icon: <Icon as={MdElectricalServices} width="20px" height="20px" color="inherit" />,
    component: <UtilityBillsCreation />,
  },
];

// User routes
export const userRoutes = [
    {
    name: 'User Profile',
    layout: '/user',
    path: '/profile-user',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <UserProfile />,
  },
  {
    name: 'User Homepage',
    layout: '/user',
    path: '/profile',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <UserHomePage />,
  },
  {
    name: 'Bill Payment Service',
    layout: '/user',
    path: '/payment',
    icon: <Icon as={MdPayment} width="20px" height="20px" color="inherit" />,
    component: <UserPay />,
  },
  {
    name: 'Contribution Service',
    layout: '/user',
    path: '/contribution',
    icon: <Icon as={MdAttachMoney} width="20px" height="20px" color="inherit" />,
    component: <UserContribution />,
  },
];

// Auth routes
export const authRoutes = [
  {
    name: 'Sign In',
    layout: '/auth',
    path: '/sign-in',
    icon: <Icon as={MdLock} width="20px" height="20px" color="inherit" />,
    component: <SignInCentered />,
  },
  {
    layout: '/auth',
    path: '/sign-up',
    component: <SignUpCentered />,
  },
  {
    layout: '/auth',
    path: '/verify',
    component: <VerifySignUpCentered />,
  },
  {
    layout: '/auth',
    path: '/forgot-password',
    component: <ForgotSignUpCentered />,
  },
  {
    layout: '/auth',
    path: '/verify-forgot-password',
    component: <VerifyForgotSignUpCentered />,
  },
];

// Combine all routes
const routes = [...adminRoutes, ...userRoutes, ...authRoutes];

export default routes;
