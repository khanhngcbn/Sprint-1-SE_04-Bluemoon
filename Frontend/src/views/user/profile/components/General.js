// Chakra imports
import { SimpleGrid, Text, useColorModeValue, Button, useDisclosure } from "@chakra-ui/react";
// Custom components
import Card from "components/card/Card.js";
import React from "react";
import {useEffect, useState} from "react";
import { useToast } from '@chakra-ui/react';
import Information from "views/admin/profile/components/Information";
import ChangePassModal from "./ChangePassModal";
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
// Assets
export default function GeneralInformation(props) {
  const { ...rest } = props;
  const toast = useToast(); // 🔹 Hook để hiển thị thông báo
  const [error, setError] = React.useState('');
  const [mode, setMode] = React.useState('');
  const { isOpen, onOpen, onClose } = useDisclosure(); // Điều khiển modal
    const [newUser, setNewUser] = React.useState({
      name: '',
      password: '',
      role: '',
      fullName: '',
      age: '',
      gender: '',
      phone: '',
      email: '',
      apartmentId: '',
    });
  // Chakra Color Mode

  const [user, setUser] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log('Đang fetch');
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/api/user/home`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const rawData = await response.json();
        console.log('rawData = ', rawData);
        setUser(rawData.resident);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleSubmit = async (formData) => {
    try {
          // Lấy token từ local storage
    const token = localStorage.getItem("token");
    if (!token) {
      setError(["No authentication token found"]);
      return;
    }
      // Gửi yêu cầu GET để lấy userId
      const responseGet = await fetch(`${API_BASE_URL}/api/user/change-password`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!responseGet.ok) {
        throw new Error("Failed to fetch userId");
      }
      
      const dataGet = await responseGet.json();
      
      // Thêm userId vào formData
      const updatedFormData = { ...formData, userId: dataGet.userId };
      console.log("updatedFormData = ", updatedFormData)
      
      try {
        const responsePost = await fetch(`${API_BASE_URL}/api/user/change-password`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(updatedFormData)
        });
      
        // Đọc response body một lần
        const responseData = await responsePost.json();
        console.log("Response Data:", responseData);
      
        // Kiểm tra nếu request không thành công
        if (!responsePost.ok) {
          setError(responseData.error || "Có lỗi xảy ra!");
          return;
        }
        onClose();
      
        // Xử lý khi đổi mật khẩu thành công
        console.log("Password changed successfully:", responseData.message);
        toast({
          title: 'Changing Password Successful!',
          status: 'success',
          duration: 4000,
          isClosable: true,
      });
      } catch (error) {
        console.error("Lỗi khi gọi API:", error);
        setError("Lỗi kết nối đến server!");
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setError(["An unexpected error occurred"]);
    }
  };
  



  const textColorPrimary = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = "gray.400";
  const cardShadow = useColorModeValue(
    "0px 18px 40px rgba(112, 144, 176, 0.12)",
    "unset"
  );
  return (
    <Card mb={{ base: "0px", "2xl": "20px" }} {...rest}>
      <Text
        color={textColorPrimary}
        fontWeight='bold'
        fontSize='2xl'
        mt='10px'
        mb='4px'>
        Your Information
      </Text>
      <Text color={textColorSecondary} fontSize='md' me='26px' mb='40px'>
        From SE04 Team
      </Text>
      <SimpleGrid columns='2' gap='20px'>
          <Information boxShadow={cardShadow} title='Full Name' value={user.fullName} />
          <Information boxShadow={cardShadow} title='Email' value={user.email} />
          <Information boxShadow={cardShadow} title='Phone' value={user.phone} />
          <Information boxShadow={cardShadow} title='Age' value={user.age} />
          <Button
                  variant="darkBrand"
                  color="white"
                  fontSize="sm"
                  fontWeight="500"
                  borderRadius="10px"
                  px="15px"
                  py="5px"
                  onClick={() => {
                    onOpen();
                    setMode('create');
                  }}
                >
                  Change password
                </Button>
      </SimpleGrid>
              <ChangePassModal
                isOpen={isOpen}
                onClose={onClose}
                userData={newUser}
                mode={mode}
                onSubmit={handleSubmit}
                error={error}
              />
    </Card>
  );
}
